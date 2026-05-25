import { useState, useCallback, useRef } from "react";
import { useConversation } from "@elevenlabs/react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export function useElevenLabsAgent() {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isAgentSpeaking, setIsAgentSpeaking] = useState(false);
  const [isAgentConnected, setIsAgentConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const msgCounter = useRef(0);

  const conversation = useConversation({
    onConnect: () => {
      setIsAgentConnected(true);
      setError(null);
    },
    onDisconnect: () => {
      setIsAgentConnected(false);
      setMicStream(null);
    },
    onMessage: (message) => {
      if (message.source === "ai" && message.message) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${++msgCounter.current}`,
            role: "assistant",
            content: message.message,
            timestamp: new Date(),
          },
        ]);
      } else if (message.source === "user" && message.message) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${++msgCounter.current}`,
            role: "user",
            content: message.message,
            timestamp: new Date(),
          },
        ]);
      }
    },
    onModeChange: (mode) => {
      setIsAgentSpeaking(mode.mode === "speaking");
    },
    onError: (err) => {
      setError(typeof err === "string" ? err : "Connection error");
      console.error("ElevenLabs error:", err);
    },
  });

  const connect = useCallback(async () => {
    try {
      setError(null);
      // Request mic access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setMicStream(stream);

      const agentId = import.meta.env.VITE_ELEVENLABS_AGENT_ID;
      if (!agentId || agentId === "your_agent_id_here") {
        setError("Please set VITE_ELEVENLABS_AGENT_ID in .env.local");
        return;
      }

      await conversation.startSession({
        agentId,
        connectionType: "webrtc",
      });
    } catch (err: any) {
      setError(err.message || "Failed to connect");
    }
  }, [conversation]);

  const disconnect = useCallback(async () => {
    await conversation.endSession();
    setMicStream(null);
    setChatMessages([]);
  }, [conversation]);

  const toggleMicrophone = useCallback(async () => {
    // ElevenLabs handles mic internally
  }, []);

  const sendTextMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${++msgCounter.current}`,
          role: "user",
          content: text,
          timestamp: new Date(),
        },
      ]);
      // ElevenLabs sendUserMessage if available
      if (
        conversation &&
        typeof (conversation as any).sendUserMessage === "function"
      ) {
        await (conversation as any).sendUserMessage(text);
      }
    },
    [conversation],
  );

  return {
    connect,
    disconnect,
    toggleMicrophone,
    sendTextMessage,
    isConnected: conversation.status === "connected",
    isConnecting:
      conversation.status !== "connected" &&
      conversation.status !== "disconnected",
    isMicEnabled: !!micStream,
    isAgentSpeaking: conversation.isSpeaking || isAgentSpeaking,
    isAgentConnected,
    error,
    micStream,
    agentAudioStream: null as MediaStream | null,
    chatMessages,
  };
}
