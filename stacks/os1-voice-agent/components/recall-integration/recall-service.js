#!/usr/bin/env node
// recall-service.js — Recall.ai proxy + real-time SSE bridge
// Runs on 127.0.0.1:18791 (loopback). nginx forwards /recall/* here.
// No npm dependencies — pure Node.js built-ins only.

import https from "https";
import http from "http";

const PORT = parseInt(process.env.RECALL_PORT || "18791");
const API_KEY = process.env.RECALL_API_KEY || "";
const PUBLIC_HOST = process.env.PUBLIC_HOST || "";

// Recall.ai regional API host. Change to us-east-1 or eu-west-2 if needed.
const RECALL_HOST = process.env.RECALL_HOST || "us-west-2.recall.ai";

// ── SSE broadcast to all connected dashboard tabs ────────────────────────────
const sseClients = new Set();

function broadcast(event) {
  const line = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of sseClients) {
    try {
      res.write(line);
    } catch {
      sseClients.delete(res);
    }
  }
}

// ── Recall.ai REST helper ─────────────────────────────────────────────────────
function recallFetch(method, path, body) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const options = {
      hostname: RECALL_HOST,
      path: `/api/v1${path}`,
      method,
      headers: {
        Authorization: `Token ${API_KEY}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
      },
    };
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: { raw: data } });
        }
      });
    });
    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

// ── HTTP helpers ──────────────────────────────────────────────────────────────
function readBody(req) {
  return new Promise((resolve, reject) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => {
      try {
        resolve(s ? JSON.parse(s) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

function send(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
  });
  res.end(body);
}

// ── Router ────────────────────────────────────────────────────────────────────
const server = http.createServer(async (req, res) => {
  const { method } = req;
  const url = new URL(req.url, "http://localhost");
  const p = url.pathname;

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  // Health
  if (p === "/health" && method === "GET") {
    return send(res, 200, { ok: true, host: RECALL_HOST });
  }

  // ── SSE stream — dashboard subscribes here for live events ──
  if (p === "/events" && method === "GET") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(": connected\n\n");
    // Heartbeat every 25 s to keep the connection alive through proxies
    const hb = setInterval(() => {
      try {
        res.write(": ping\n\n");
      } catch {
        clearInterval(hb);
      }
    }, 25_000);
    sseClients.add(res);
    req.on("close", () => {
      sseClients.delete(res);
      clearInterval(hb);
    });
    return;
  }

  // ── Webhook receiver — Recall.ai posts real-time events here ──
  if (p === "/webhook" && method === "POST") {
    const body = await readBody(req);
    broadcast(body);
    return send(res, 200, { ok: true });
  }

  // ── Bot CRUD ──────────────────────────────────────────────────

  // List bots
  if (p === "/api/bots" && method === "GET") {
    const cursor = url.searchParams.get("cursor") || "";
    const r = await recallFetch("GET", `/bot/${cursor ? `?cursor=${cursor}` : ""}`);
    return send(res, r.status, r.body);
  }

  // Create bot
  if (p === "/api/bots" && method === "POST") {
    const body = await readBody(req);
    if (!body.meeting_url) return send(res, 400, { error: "meeting_url required" });
    const webhookUrl = PUBLIC_HOST
      ? `https://${PUBLIC_HOST}/recall/webhook`
      : null;
    const payload = {
      meeting_url: body.meeting_url,
      bot_name: body.bot_name || "OS1 Notetaker",
      recording_mode: "audio_only",
      ...(webhookUrl
        ? {
            real_time_transcription: {
              destination_url: webhookUrl,
              partial_results: false,
            },
          }
        : {}),
    };
    const r = await recallFetch("POST", "/bot/", payload);
    return send(res, r.status, r.body);
  }

  // Get bot
  const mBot = p.match(/^\/api\/bots\/([^/]+)$/);
  if (mBot && method === "GET") {
    const r = await recallFetch("GET", `/bot/${mBot[1]}/`);
    return send(res, r.status, r.body);
  }

  // Leave call
  const mLeave = p.match(/^\/api\/bots\/([^/]+)\/leave$/);
  if (mLeave && method === "POST") {
    const r = await recallFetch("POST", `/bot/${mLeave[1]}/leave_call/`);
    return send(res, r.status, r.body);
  }

  // Get transcript
  const mTranscript = p.match(/^\/api\/bots\/([^/]+)\/transcript$/);
  if (mTranscript && method === "GET") {
    const r = await recallFetch("GET", `/bot/${mTranscript[1]}/transcript/`);
    return send(res, r.status, r.body);
  }

  send(res, 404, { error: "not found" });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[recall-service] 127.0.0.1:${PORT} → ${RECALL_HOST}`);
  if (!API_KEY) console.warn("[recall-service] RECALL_API_KEY not set — API calls will fail");
});
