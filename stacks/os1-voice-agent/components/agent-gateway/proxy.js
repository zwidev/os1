// OS1 Voice Proxy - hybrid "talk fast + do in background"  (marketplace build)
// ----------------------------------------------------------------------------
// Talking layer:  ElevenLabs -> this proxy -> Anthropic (Claude) directly.
//                 Fast (2-4s), stays under ElevenLabs' ~15s LLM timeout.
// Doing layer:    When the talking layer decides the user asked for real work,
//                 it emits a hidden <<TASK>>...<<END>> marker. The proxy strips
//                 it from the spoken reply and dispatches the task to the local
//                 OpenClaw gateway (full tools) in the BACKGROUND, decoupled
//                 from the ElevenLabs request so it finishes regardless.
// Report back:    Completed task results are stored in STATUS_FILE and injected
//                 into the next voice turn so the agent can announce them.
//
// CONFIG IS ENV-DRIVEN. No secrets are committed. The ZenCore provisioner sets:
//   OPENCLAW_TOKEN, AUTH_PROFILE_PATH, STATUS_FILE, PROXY_PORT, OPENCLAW_PORT,
//   ANTHROPIC_MODEL, WORK_DIR
// ----------------------------------------------------------------------------

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const PROXY_PORT = parseInt(process.env.PROXY_PORT || '18790', 10);
const OPENCLAW_PORT = parseInt(process.env.OPENCLAW_PORT || '18789', 10);
const OPENCLAW_TOKEN = process.env.OPENCLAW_TOKEN || '';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5';
const ANTHROPIC_VERSION = '2023-06-01';
const DEFAULT_MAX_TOKENS = parseInt(process.env.MAX_TOKENS || '1024', 10);
const HOME = process.env.HOME || process.env.USERPROFILE || '/opt/os1';
const AUTH_PROFILE_PATH = process.env.AUTH_PROFILE_PATH || path.join(HOME, '.openclaw/agents/main/agent/auth-profiles.json');
const STATUS_FILE = process.env.STATUS_FILE || path.join(HOME, 'task-status.json');
// Where the worker should operate by default (tenant-configurable).
const WORK_DIR = process.env.WORK_DIR || path.join(HOME, 'workspace');

// ---- Anthropic API key: env first, else OpenClaw auth profile ----------------
function loadApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const auth = JSON.parse(fs.readFileSync(AUTH_PROFILE_PATH, 'utf8'));
    return auth.profiles['anthropic:default'].key;
  } catch (e) {
    console.error('No ANTHROPIC_API_KEY env and could not read auth profile:', e.message);
    return '';
  }
}
const API_KEY = loadApiKey();

// ---- Task status store -------------------------------------------------------
function readStatus() {
  try { return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf8')); } catch { return { tasks: [] }; }
}
function writeStatus(s) {
  try { fs.writeFileSync(STATUS_FILE, JSON.stringify(s, null, 2)); }
  catch (e) { console.error('Failed to write status file:', e.message); }
}
function drainCompletedForAnnouncement() {
  const s = readStatus();
  const pending = (s.tasks || []).filter(t => !t.announced && (t.status === 'done' || t.status === 'error'));
  if (pending.length) {
    for (const t of s.tasks) {
      if (!t.announced && (t.status === 'done' || t.status === 'error')) t.announced = true;
    }
    writeStatus(s);
  }
  return pending;
}
function getRunningTasks() {
  return (readStatus().tasks || []).filter(t => t.status === 'running');
}
function isDuplicateTask(task) {
  const s = readStatus();
  const now = Date.now();
  const norm = (x) => (x || '').trim().toLowerCase();
  return (s.tasks || []).some(t => {
    if (norm(t.task) !== norm(task)) return false;
    if (t.status === 'running') return true;
    const ts = Date.parse(t.finishedAt || t.createdAt || 0);
    return (now - ts) < 3 * 60 * 1000;
  });
}
function recordTask(task) {
  const s = readStatus();
  const id = 'task-' + Date.now();
  s.tasks = s.tasks || [];
  s.tasks.push({ id, task, status: 'running', result: null, createdAt: new Date().toISOString(), announced: false });
  if (s.tasks.length > 50) s.tasks = s.tasks.slice(-50);
  writeStatus(s);
  return id;
}
function finishTask(id, status, result) {
  const s = readStatus();
  const t = (s.tasks || []).find(x => x.id === id);
  if (t) { t.status = status; t.result = result; t.finishedAt = new Date().toISOString(); }
  writeStatus(s);
}

// ---- Memory recall: durable memory (MEMORY.md) + today's daily note ----------
// Read directly (instant). A per-turn CLI semantic search cold-starts too slowly
// for voice; Dreaming consolidates recurring facts into MEMORY.md nightly.
function recallMemory(cb) {
  try {
    let out = '';
    const memPath = path.join(WORK_DIR, 'MEMORY.md');
    if (fs.existsSync(memPath)) {
      const mem = fs.readFileSync(memPath, 'utf8').trim();
      if (mem) out += 'Durable memory (MEMORY.md):\n' + mem + '\n\n';
    }
    const today = new Date().toISOString().slice(0, 10);
    const dailyPath = path.join(WORK_DIR, 'memory', today + '.md');
    if (fs.existsSync(dailyPath)) {
      const daily = fs.readFileSync(dailyPath, 'utf8').trim();
      if (daily) out += "Today's notes (" + today + "):\n" + daily;
    }
    cb(out.trim().slice(0, 4000));
  } catch { cb(''); }
}

// ---- Talking-layer system prompt ---------------------------------------------
function buildSystemPrompt(elevenLabsSystem, completedTasks, runningTasks, memoryText) {
  const parts = [];
  if (elevenLabsSystem) parts.push(elevenLabsSystem);
  if (memoryText) {
    parts.push('Relevant memory from past sessions (use it naturally to inform your reply; do not read it aloud verbatim):\n' + memoryText);
  }
  parts.push(
    'You are speaking out loud through a voice interface, so keep replies short and natural.\n' +
    'You have a background worker that can edit files, run code, and use tools on the server.\n' +
    'When the user asks you to actually DO something (change code, edit a file, run a command, ' +
    'create something), do NOT do it yourself in this reply. Instead:\n' +
    '  1. Briefly tell them you are starting on it (one sentence).\n' +
    '  2. On a NEW final line, output the task for the worker EXACTLY as:\n' +
    '     <<TASK>>full self-contained instruction here<<END>>\n' +
    'The user will NOT hear the <<TASK>> line. Only include it when real work is needed.\n' +
    'CRITICAL: Never re-issue a <<TASK>> for something listed below as in progress or finished.'
  );
  parts.push(
    'MEMORY: When the user shares something worth keeping long-term (a preference, a fact about ' +
    'them, a decision, an ongoing project), persist it by emitting a task on its own final line:\n' +
    '  <<TASK>>Append this durable fact to the workspace MEMORY.md file (create it if missing): "<the exact fact>"<<END>>\n' +
    'Acknowledge briefly ("Got it, I\'ll remember that."). Use the memory above to stay consistent and avoid asking what you already know.'
  );
  if (runningTasks && runningTasks.length) {
    parts.push('Tasks ALREADY IN PROGRESS (do NOT start again):\n' + runningTasks.map(t => `- "${t.task}"`).join('\n'));
  }
  if (completedTasks && completedTasks.length) {
    parts.push('Tasks that just finished (mention naturally if relevant):\n' +
      completedTasks.map(t => `- "${t.task}" => ${t.status === 'done' ? 'DONE' : 'FAILED'}${t.result ? ': ' + t.result : ''}`).join('\n'));
  }
  return parts.join('\n\n');
}

function extractText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(c => (typeof c === 'string' ? c : (c.text || ''))).join('');
  return '';
}
function toAnthropic(reqBody, completedTasks, runningTasks, memoryText) {
  const systemParts = [];
  const messages = [];
  for (const m of reqBody.messages || []) {
    const content = extractText(m.content);
    if (m.role === 'system') { systemParts.push(content); continue; }
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content += '\n' + content;
    else messages.push({ role, content });
  }
  if (messages.length === 0 || messages[0].role !== 'user') messages.unshift({ role: 'user', content: 'Hello' });
  return {
    model: ANTHROPIC_MODEL,
    max_tokens: reqBody.max_tokens || DEFAULT_MAX_TOKENS,
    system: buildSystemPrompt(systemParts.join('\n\n'), completedTasks, runningTasks, memoryText),
    messages,
    temperature: typeof reqBody.temperature === 'number' ? reqBody.temperature : undefined,
  };
}

function callAnthropic(anthropicBody, callback) {
  const body = JSON.stringify({ ...anthropicBody, stream: false });
  const req = https.request({
    hostname: 'api.anthropic.com', port: 443, path: '/v1/messages', method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'x-api-key': API_KEY,
      'anthropic-version': ANTHROPIC_VERSION,
    },
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => { try { callback(null, JSON.parse(data)); } catch (e) { callback(e); } });
  });
  req.on('error', callback);
  req.write(body);
  req.end();
}

// ---- Background worker dispatch to local OpenClaw -----------------------------
function dispatchToWorker(taskInstruction) {
  if (isDuplicateTask(taskInstruction)) {
    console.log('[worker] skipping duplicate task:', taskInstruction.slice(0, 80));
    return;
  }
  const id = recordTask(taskInstruction);
  console.log(`[worker] dispatching ${id}: ${taskInstruction.slice(0, 80)}`);

  const envPrefix =
    `[System environment - use these absolute paths:\n` +
    `  Working dir = "${WORK_DIR}"\n` +
    `  Home        = "${HOME}"\n` +
    `Always use absolute paths. Verify files exist after writing.]\n\n`;

  const body = JSON.stringify({
    model: 'openclaw/default',
    messages: [{ role: 'user', content: envPrefix + taskInstruction }],
    stream: false,
  });
  const req = http.request({
    hostname: '127.0.0.1', port: OPENCLAW_PORT, path: '/v1/chat/completions', method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
      'Authorization': 'Bearer ' + OPENCLAW_TOKEN,
      'x-openclaw-session-key': 'voice-worker',
    },
  }, (res) => {
    let data = '';
    res.on('data', c => data += c);
    res.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        finishTask(id, 'done', (parsed.choices?.[0]?.message?.content || '(no output)').slice(0, 500));
        console.log(`[worker] ${id} done`);
      } catch (e) {
        finishTask(id, 'error', 'parse error: ' + e.message);
      }
    });
  });
  req.on('error', (e) => { finishTask(id, 'error', e.message); console.error(`[worker] ${id} error:`, e.message); });
  req.setTimeout(0);
  req.write(body);
  req.end();
}

// ---- Server ------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const url = req.url;
  if (req.method === 'GET' && url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }
  if (req.method === 'GET' && url === '/v1/models') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ object: 'list', data: [{ id: ANTHROPIC_MODEL, object: 'model', created: 0, owned_by: 'anthropic' }] }));
    return;
  }
  if (req.method === 'POST' && url === '/v1/chat/completions') {
    let raw = '';
    req.on('data', c => raw += c);
    req.on('end', () => {
      let reqBody;
      try { reqBody = JSON.parse(raw); }
      catch { res.writeHead(400); res.end(JSON.stringify({ error: 'Invalid JSON' })); return; }

      const wantsStream = reqBody.stream === true;
      const completed = drainCompletedForAnnouncement();
      const running = getRunningTasks();

      recallMemory((memoryText) => {
      const anthropicBody = toAnthropic(reqBody, completed, running, memoryText);

      callAnthropic(anthropicBody, (err, parsed) => {
        if (err || !parsed || parsed.error) {
          const msg = err ? err.message : JSON.stringify(parsed && parsed.error);
          console.error('Anthropic error:', msg);
          res.writeHead(502); res.end(JSON.stringify({ error: msg }));
          return;
        }
        let fullText = (parsed.content || []).map(c => c.text || '').join('');
        const taskMatch = fullText.match(/<<TASK>>([\s\S]*?)<<END>>/);
        if (taskMatch) {
          const taskInstruction = taskMatch[1].trim();
          fullText = fullText.replace(/<<TASK>>[\s\S]*?<<END>>/, '').trim();
          if (taskInstruction) dispatchToWorker(taskInstruction);
        }
        if (!fullText) fullText = 'Okay.';

        const id = 'chatcmpl-' + Date.now();
        const created = Math.floor(Date.now() / 1000);
        const model = reqBody.model || ANTHROPIC_MODEL;

        if (wantsStream) {
          res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'Access-Control-Allow-Origin': '*' });
          res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: { role: 'assistant', content: fullText }, finish_reason: null }] })}\n\n`);
          res.write(`data: ${JSON.stringify({ id, object: 'chat.completion.chunk', created, model, choices: [{ index: 0, delta: {}, finish_reason: 'stop' }] })}\n\n`);
          res.write('data: [DONE]\n\n');
          res.end();
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            id, object: 'chat.completion', created, model,
            choices: [{ index: 0, message: { role: 'assistant', content: fullText }, finish_reason: 'stop' }],
            usage: parsed.usage ? { prompt_tokens: parsed.usage.input_tokens || 0, completion_tokens: parsed.usage.output_tokens || 0, total_tokens: (parsed.usage.input_tokens || 0) + (parsed.usage.output_tokens || 0) } : null
          }));
        }
      });
      });
    });
    return;
  }
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PROXY_PORT, '127.0.0.1', () => {
  console.log(`OS1 Voice Proxy on http://127.0.0.1:${PROXY_PORT}`);
  console.log(`Model: ${ANTHROPIC_MODEL} | API key: ${API_KEY ? 'loaded' : 'MISSING'}`);
  console.log(`OpenClaw worker: 127.0.0.1:${OPENCLAW_PORT} | token: ${OPENCLAW_TOKEN ? 'set' : 'MISSING'}`);
});
