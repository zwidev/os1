import { useState, useEffect, useCallback, useRef } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type BotStatus =
  | "ready"
  | "joining_call"
  | "in_call_not_recording"
  | "in_call_recording"
  | "call_ended"
  | "done"
  | "fatal";

export interface BotStatusChange {
  code: BotStatus;
  created_at: string;
  message?: string;
  sub_code?: string;
}

export interface RecallBot {
  id: string;
  meeting_url: string;
  bot_name: string;
  status_changes: BotStatusChange[];
  created_at: string;
  video_url?: string | null;
  media_retention_end?: string | null;
}

export interface TranscriptWord {
  text: string;
  start_timestamp?: { relative?: number; absolute?: string };
  end_timestamp?: { relative?: number; absolute?: string };
  confidence?: number;
}

export interface TranscriptEntry {
  speaker: string;
  words: TranscriptWord[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

export function latestStatus(bot: RecallBot): BotStatus | null {
  return bot.status_changes?.length
    ? bot.status_changes[bot.status_changes.length - 1].code
    : null;
}

export function isActiveStatus(s: BotStatus | null): boolean {
  return !!s && ["joining_call", "in_call_not_recording", "in_call_recording"].includes(s);
}

export function statusLabel(s: BotStatus | null): string {
  const labels: Partial<Record<BotStatus, string>> = {
    ready: "Ready",
    joining_call: "Joining…",
    in_call_not_recording: "In call",
    in_call_recording: "Recording",
    call_ended: "Call ended",
    done: "Done",
    fatal: "Error",
  };
  return s ? labels[s] ?? s : "Unknown";
}

export function meetingPlatform(url: string): string {
  if (url.includes("zoom.us")) return "Zoom";
  if (url.includes("meet.google.com")) return "Google Meet";
  if (url.includes("teams.microsoft.com") || url.includes("teams.live.com")) return "Teams";
  if (url.includes("webex.com")) return "Webex";
  if (url.includes("gotomeet.me") || url.includes("goto.com")) return "GoTo";
  return "Meeting";
}

// ── API fetch helper ──────────────────────────────────────────────────────────

const RECALL_BASE =
  (import.meta.env.VITE_RECALL_SERVICE_URL as string | undefined) || "/recall";

async function apiFetch<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${RECALL_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(opts.headers as Record<string, string> ?? {}) },
    ...opts,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? data.error ?? `HTTP ${res.status}`);
  return data as T;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useRecall() {
  const [bots, setBots] = useState<RecallBot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState<boolean | null>(null);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [selectedBotId, setSelectedBotId] = useState<string | null>(null);
  const [liveEvents, setLiveEvents] = useState<unknown[]>([]);
  const pollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch helpers ─────────────────────────────────────────────────────────

  const fetchBots = useCallback(async () => {
    try {
      const data = await apiFetch<{ results?: RecallBot[] } | RecallBot[]>("/api/bots");
      setBots(Array.isArray(data) ? data : (data.results ?? []));
    } catch {
      // Silently skip polling failures
    }
  }, []);

  const fetchTranscript = useCallback(async (botId: string) => {
    try {
      const data = await apiFetch<TranscriptEntry[]>(`/api/bots/${botId}/transcript`);
      setTranscript(Array.isArray(data) ? data : []);
    } catch {
      setTranscript([]);
    }
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────

  const createBot = useCallback(
    async (meetingUrl: string, botName?: string): Promise<RecallBot> => {
      setLoading(true);
      setError(null);
      try {
        const bot = await apiFetch<RecallBot>("/api/bots", {
          method: "POST",
          body: JSON.stringify({ meeting_url: meetingUrl, bot_name: botName }),
        });
        setBots((prev) => [bot, ...prev]);
        setSelectedBotId(bot.id);
        return bot;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const leaveBot = useCallback(
    async (botId: string) => {
      await apiFetch(`/api/bots/${botId}/leave`, { method: "POST" });
      await fetchBots();
    },
    [fetchBots],
  );

  // ── SSE subscription ──────────────────────────────────────────────────────

  useEffect(() => {
    const es = new EventSource(`${RECALL_BASE}/events`);
    es.onopen = () => setServiceAvailable(true);
    es.onerror = () => setServiceAvailable(false);
    es.onmessage = (e) => {
      if (!e.data || e.data.startsWith(":")) return;
      try {
        const evt = JSON.parse(e.data) as Record<string, unknown>;
        setLiveEvents((prev) => [evt, ...prev].slice(0, 200));
        const evtType = typeof evt.event === "string" ? evt.event : "";
        if (evtType.startsWith("bot.")) {
          fetchBots();
        }
      } catch {
        // ignore malformed SSE
      }
    };
    return () => es.close();
  }, [fetchBots]);

  // ── Polling for active bots ───────────────────────────────────────────────

  useEffect(() => {
    if (pollerRef.current) clearInterval(pollerRef.current);
    const hasActive = bots.some((b) => isActiveStatus(latestStatus(b)));
    if (!hasActive) return;
    pollerRef.current = setInterval(fetchBots, 8_000);
    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, [bots, fetchBots]);

  // ── Fetch transcript when selection changes ───────────────────────────────

  useEffect(() => {
    if (selectedBotId) fetchTranscript(selectedBotId);
    else setTranscript([]);
  }, [selectedBotId, fetchTranscript]);

  // ── Initial load ──────────────────────────────────────────────────────────

  useEffect(() => {
    // Check service health first
    fetch(`${RECALL_BASE}/health`)
      .then((r) => {
        setServiceAvailable(r.ok);
        if (r.ok) fetchBots();
      })
      .catch(() => setServiceAvailable(false));
  }, [fetchBots]);

  return {
    bots,
    loading,
    error,
    serviceAvailable,
    transcript,
    selectedBotId,
    setSelectedBotId,
    liveEvents,
    createBot,
    leaveBot,
    fetchBots,
    fetchTranscript,
  };
}
