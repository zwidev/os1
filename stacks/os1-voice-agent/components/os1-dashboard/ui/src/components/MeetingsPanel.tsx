import { useState, useRef, useEffect } from "react";
import {
  Video,
  Plus,
  X,
  FileText,
  ChevronRight,
  Clock,
  Radio,
  WifiOff,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import {
  useRecall,
  latestStatus,
  isActiveStatus,
  statusLabel,
  meetingPlatform,
  type RecallBot,
  type BotStatus,
} from "@/hooks/useRecall";

// ── Status dot ────────────────────────────────────────────────────────────────

const STATUS_DOT: Record<BotStatus, string> = {
  ready: "bg-zinc-400",
  joining_call: "bg-amber-400 animate-pulse",
  in_call_not_recording: "bg-blue-400",
  in_call_recording: "bg-red-500 animate-pulse",
  call_ended: "bg-zinc-500",
  done: "bg-emerald-500",
  fatal: "bg-red-700",
};

const STATUS_BADGE: Record<BotStatus, string> = {
  ready: "bg-zinc-800 text-zinc-400",
  joining_call: "bg-amber-900/60 text-amber-300",
  in_call_not_recording: "bg-blue-900/60 text-blue-300",
  in_call_recording: "bg-red-900/60 text-red-400",
  call_ended: "bg-zinc-800 text-zinc-400",
  done: "bg-emerald-900/40 text-emerald-400",
  fatal: "bg-red-900/60 text-red-400",
};

function StatusDot({ status }: { status: BotStatus | null }) {
  const cls = status ? STATUS_DOT[status] : "bg-zinc-600";
  return <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${cls}`} />;
}

function StatusBadge({ status }: { status: BotStatus | null }) {
  if (!status) return null;
  const cls = STATUS_BADGE[status] ?? "bg-zinc-800 text-zinc-400";
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cls}`}>
      {statusLabel(status)}
    </span>
  );
}

// ── Platform icon (text-based) ────────────────────────────────────────────────

function PlatformBadge({ url }: { url: string }) {
  const platform = meetingPlatform(url);
  const colors: Record<string, string> = {
    Zoom: "bg-blue-600",
    "Google Meet": "bg-green-600",
    Teams: "bg-purple-600",
    Webex: "bg-sky-600",
    GoTo: "bg-orange-600",
    Meeting: "bg-zinc-600",
  };
  const cls = colors[platform] ?? "bg-zinc-600";
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${cls} text-white`}>
      {platform}
    </span>
  );
}

// ── Send bot form ─────────────────────────────────────────────────────────────

function SendBotForm({ onCreate }: { onCreate: (url: string, name?: string) => Promise<unknown> }) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setErr("");
    try {
      await onCreate(url.trim(), name.trim() || undefined);
      setUrl("");
      setName("");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Failed to send bot");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-2.5">
      <div>
        <label className="block text-[11px] font-medium text-zinc-500 mb-1 uppercase tracking-wide">
          Meeting URL
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://zoom.us/j/… or meet.google.com/…"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
          disabled={busy}
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-zinc-500 mb-1 uppercase tracking-wide">
          Bot name <span className="normal-case text-zinc-600">(optional)</span>
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="OS1 Notetaker"
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors"
          disabled={busy}
        />
      </div>
      {err && <p className="text-red-400 text-xs leading-snug">{err}</p>}
      <button
        type="submit"
        disabled={busy || !url.trim()}
        className="w-full flex items-center justify-center gap-2 bg-white text-zinc-900 rounded-lg py-2 text-sm font-semibold disabled:opacity-40 hover:bg-zinc-200 active:bg-zinc-300 transition-colors"
      >
        {busy ? (
          <RefreshCw size={14} className="animate-spin" />
        ) : (
          <Plus size={14} />
        )}
        {busy ? "Sending bot…" : "Send Bot"}
      </button>
    </form>
  );
}

// ── Bot list row ──────────────────────────────────────────────────────────────

function BotRow({
  bot,
  selected,
  onSelect,
  onLeave,
}: {
  bot: RecallBot;
  selected: boolean;
  onSelect: () => void;
  onLeave: () => void;
}) {
  const status = latestStatus(bot);
  const active = isActiveStatus(status);
  const created = new Date(bot.created_at).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-xl p-3 border transition-all ${
        selected
          ? "border-zinc-500 bg-zinc-800/80"
          : "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={status} />
          <PlatformBadge url={bot.meeting_url} />
          <span className="text-sm font-medium text-zinc-200 truncate">
            {bot.bot_name}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <StatusBadge status={status} />
          {active && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onLeave();
              }}
              className="ml-0.5 text-zinc-600 hover:text-red-400 transition-colors rounded p-0.5"
              title="Remove bot from call"
            >
              <X size={13} />
            </button>
          )}
          <ChevronRight
            size={13}
            className={`text-zinc-600 transition-transform ${selected ? "rotate-90" : ""}`}
          />
        </div>
      </div>
      <div className="flex items-center gap-3 mt-1.5 pl-4">
        <span className="text-[11px] text-zinc-600 flex items-center gap-1">
          <Clock size={10} />
          {created}
        </span>
        <span className="text-[11px] text-zinc-600 truncate">{bot.meeting_url}</span>
      </div>
    </button>
  );
}

// ── Transcript view ───────────────────────────────────────────────────────────

function TranscriptView({
  transcript,
}: {
  transcript: Array<{ speaker: string; words: Array<{ text: string }> }>;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  const fullText = transcript
    .map((e) => `${e.speaker}: ${e.words.map((w) => w.text).join(" ")}`)
    .join("\n\n");

  const copy = async () => {
    await navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!transcript.length) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-2">
        <FileText size={24} className="opacity-40" />
        <p className="text-sm">No transcript yet</p>
        <p className="text-xs opacity-60">Transcript appears once the bot joins the call</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800 shrink-0">
        <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
          Transcript · {transcript.length} segments
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {transcript.map((entry, i) => (
          <div key={i}>
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wide">
              {entry.speaker || "Speaker"}
            </span>
            <p className="text-sm text-zinc-200 mt-0.5 leading-relaxed">
              {entry.words.map((w) => w.text).join(" ")}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

// ── Service unavailable banner ────────────────────────────────────────────────

function ServiceBanner() {
  return (
    <div className="m-4 rounded-xl border border-zinc-700 bg-zinc-900 p-4 text-sm text-zinc-400">
      <div className="flex items-center gap-2 mb-2 font-medium text-zinc-300">
        <WifiOff size={14} />
        Recall service not running
      </div>
      <p className="text-xs leading-relaxed text-zinc-500">
        The <code className="text-zinc-400">recall-integration</code> component isn't installed or
        hasn't started yet. Install it from the ZenCore provisioner with a valid{" "}
        <code className="text-zinc-400">RECALL_API_KEY</code>.
      </p>
    </div>
  );
}

// ── Main panel ────────────────────────────────────────────────────────────────

export function MeetingsPanel() {
  const {
    bots,
    serviceAvailable,
    transcript,
    selectedBotId,
    setSelectedBotId,
    liveEvents,
    createBot,
    leaveBot,
    fetchBots,
  } = useRecall();

  const [showLive, setShowLive] = useState(false);
  const selectedBot = bots.find((b) => b.id === selectedBotId);
  const activeBots = bots.filter((b) => isActiveStatus(latestStatus(b)));

  return (
    <div className="flex h-full bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* ── Left sidebar ───────────────────────────────────────── */}
      <div className="w-80 shrink-0 border-r border-zinc-800 flex flex-col">
        {/* Sidebar header */}
        <div className="px-4 pt-4 pb-3 border-b border-zinc-800 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Video size={16} className="text-zinc-500" />
              <h2 className="text-sm font-semibold text-zinc-200">Meetings</h2>
              {activeBots.length > 0 && (
                <span className="text-[10px] font-semibold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full">
                  {activeBots.length} live
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {liveEvents.length > 0 && (
                <button
                  onClick={() => setShowLive((v) => !v)}
                  className={`text-[10px] flex items-center gap-1 px-1.5 py-0.5 rounded-full transition-colors ${
                    showLive
                      ? "bg-emerald-900/60 text-emerald-400"
                      : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <Radio size={10} />
                  live
                </button>
              )}
              <button
                onClick={fetchBots}
                className="text-zinc-600 hover:text-zinc-400 transition-colors"
                title="Refresh"
              >
                <RefreshCw size={13} />
              </button>
            </div>
          </div>

          {serviceAvailable === false ? (
            <ServiceBanner />
          ) : (
            <SendBotForm onCreate={createBot} />
          )}
        </div>

        {/* Live events feed (collapsible) */}
        {showLive && liveEvents.length > 0 && (
          <div className="border-b border-zinc-800 px-3 py-2 max-h-32 overflow-y-auto">
            <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-wide mb-1.5">
              Live events
            </p>
            <div className="space-y-1">
              {liveEvents.slice(0, 10).map((evt, i) => (
                <div key={i} className="text-[10px] text-zinc-500 font-mono truncate">
                  {JSON.stringify(evt).slice(0, 80)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bots list */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
          {serviceAvailable !== false && bots.length === 0 && (
            <div className="text-center text-zinc-600 text-sm py-10">
              <Video size={28} className="mx-auto mb-2 opacity-30" />
              <p className="font-medium">No meetings yet</p>
              <p className="text-xs mt-1 text-zinc-700">Paste a meeting URL above to send a bot</p>
            </div>
          )}
          {bots.map((bot) => (
            <BotRow
              key={bot.id}
              bot={bot}
              selected={bot.id === selectedBotId}
              onSelect={() =>
                setSelectedBotId(bot.id === selectedBotId ? null : bot.id)
              }
              onLeave={() => leaveBot(bot.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {selectedBot ? (
          <>
            {/* Bot header */}
            <div className="border-b border-zinc-800 px-5 py-3.5 flex items-center gap-3 shrink-0">
              <StatusDot status={latestStatus(selectedBot)} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-zinc-200">
                    {selectedBot.bot_name}
                  </span>
                  <PlatformBadge url={selectedBot.meeting_url} />
                  <StatusBadge status={latestStatus(selectedBot)} />
                </div>
                <p className="text-[11px] text-zinc-600 mt-0.5 truncate">
                  {selectedBot.meeting_url}
                </p>
              </div>
              <div className="shrink-0 text-[11px] text-zinc-600">
                {new Date(selectedBot.created_at).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>

            {/* Status timeline (compact) */}
            {selectedBot.status_changes.length > 1 && (
              <div className="flex items-center gap-2 px-5 py-2 border-b border-zinc-900 overflow-x-auto shrink-0">
                {selectedBot.status_changes.map((sc, i) => (
                  <div key={i} className="flex items-center gap-1.5 shrink-0">
                    {i > 0 && <div className="w-4 h-px bg-zinc-700" />}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        i === selectedBot.status_changes.length - 1
                          ? "font-semibold " + (STATUS_BADGE[sc.code] ?? "bg-zinc-800 text-zinc-300")
                          : "text-zinc-700"
                      }`}
                    >
                      {statusLabel(sc.code)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Transcript */}
            <div className="flex-1 overflow-hidden">
              <TranscriptView transcript={transcript} />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-700 gap-3">
            <Video size={40} className="opacity-20" />
            <p className="text-sm font-medium">Select a meeting</p>
            <p className="text-xs opacity-70">View real-time transcript and status</p>
          </div>
        )}
      </div>
    </div>
  );
}
