import { useState, useEffect, useCallback, useRef } from "react";
import { Mic, MicOff, Phone, PhoneOff, MessageSquare } from "lucide-react";
import { OS1Animation } from "./OS1Animation";
import { AudioVisualizer } from "./AudioVisualizer";
import "./OS1Animation.css";
import {
  useElevenLabsAgent,
  type ChatMessage,
} from "@/hooks/useElevenLabsAgent";

export function ElevenLabsChat() {
  const [showLoadingAnimation, setShowLoadingAnimation] = useState(false);
  const [inputReady, setInputReady] = useState(false);
  const [statusText, setStatusText] = useState("Tap to connect");
  const [showChat, setShowChat] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    connect,
    disconnect,
    toggleMicrophone,
    sendTextMessage,
    isConnected,
    isConnecting,
    isMicEnabled,
    isAgentSpeaking,
    isAgentConnected,
    error,
    micStream,
    agentAudioStream,
    chatMessages,
  } = useElevenLabsAgent();

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Apply theme
  useEffect(() => {
    document.body.classList.add("os1-theme");
    return () => {
      document.body.classList.remove("os1-theme");
    };
  }, []);

  // Auto-show loading on first load
  useEffect(() => {
    setShowLoadingAnimation(true);
    const timer = setTimeout(() => {
      setShowLoadingAnimation(false);
      setInputReady(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Update status text based on connection state
  useEffect(() => {
    if (error) {
      setStatusText(`Error: ${error}`);
    } else if (isConnecting) {
      setStatusText("Connecting...");
    } else if (isConnected && isAgentConnected) {
      setStatusText("Maya is listening");
    } else if (isConnected && !isAgentConnected) {
      setStatusText("Waiting for Maya...");
    } else {
      setStatusText("Tap to connect");
    }
  }, [isConnected, isConnecting, isAgentConnected, error]);

  const handleCallToggle = useCallback(() => {
    if (isConnected) {
      disconnect();
      setShowChat(false);
    } else {
      connect();
    }
  }, [isConnected, connect, disconnect]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const isAnimating = isAgentSpeaking || isConnecting;

  return (
    <div className="os1-container">
      {/* The beautiful OS1 Three.js animation */}
      <OS1Animation
        isTTSProcessing={isAnimating}
        showTransformation={showLoadingAnimation}
      />

      {/* Loading bar during connection */}
      {isConnecting && (
        <div className="loading-bar-container">
          <div className="loading-bar" style={{ width: "60%" }}></div>
        </div>
      )}

      {/* Error display */}
      {error && !isConnected && (
        <div className="connection-error">
          <span>{error}</span>
          <button onClick={() => connect()} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {/* Audio visualizer - shows when mic is active */}
      {micStream && isMicEnabled && isConnected && (
        <div className="audio-visualizer-container">
          <div className="visualizer-glow"></div>
          <div className="visualizer-inner">
            <AudioVisualizer stream={micStream} className="os1-visualizer" />
          </div>
        </div>
      )}

      {/* Agent audio visualizer - shows when agent is speaking */}
      {agentAudioStream && isAgentSpeaking && (
        <div className="audio-visualizer-container agent-visualizer">
          <div className="visualizer-glow"></div>
          <div className="visualizer-inner">
            <AudioVisualizer
              stream={agentAudioStream}
              className="os1-visualizer"
            />
          </div>
        </div>
      )}

      {/* Chat messages overlay - only shown when toggled */}
      {showChat && chatMessages.length > 0 && (
        <div className="chat-overlay" onClick={() => setShowChat(false)}>
          <div
            className="chat-messages-container"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="chat-messages">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`chat-message ${msg.role}`}>
                  <div className="message-content">{msg.content}</div>
                  <div className="message-time">
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* Bottom control bar */}
      <div
        className={`input-container ${inputReady ? "ready" : ""} ${isConnected ? "connected" : ""}`}
      >
        {/* Status text */}
        <div className="livekit-status-text">
          <span
            className={`status-dot ${isConnected ? (isAgentConnected ? "connected" : "waiting") : "disconnected"}`}
          />
          <span className="status-label">{statusText}</span>
        </div>

        {/* Control buttons */}
        <div className="control-buttons">
          {/* Chat toggle - only when connected and has messages */}
          {isConnected && chatMessages.length > 0 && (
            <button
              className={`chat-toggle-button ${showChat ? "active" : ""}`}
              onClick={() => setShowChat(!showChat)}
              title="Toggle chat"
            >
              <MessageSquare className="icon" size={18} />
              {chatMessages.length > 0 && (
                <span className="chat-badge">{chatMessages.length}</span>
              )}
            </button>
          )}

          {/* Mic toggle - only when connected */}
          {isConnected && (
            <button
              className={`mic-button ${isMicEnabled ? "recording" : ""}`}
              onClick={toggleMicrophone}
              title={isMicEnabled ? "Mute microphone" : "Unmute microphone"}
            >
              {isMicEnabled ? (
                <MicOff className="icon" />
              ) : (
                <Mic className="icon" />
              )}
            </button>
          )}

          {/* Call button */}
          <button
            className={`call-button ${isConnected ? "active" : ""}`}
            onClick={handleCallToggle}
            disabled={isConnecting}
            title={isConnected ? "End call" : "Start call with Maya"}
          >
            {isConnected ? (
              <PhoneOff className="icon" />
            ) : (
              <Phone className="icon" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
