import { useRef, useEffect, useState } from 'react';
import type { Message } from '../types/shopping';
import { QuickPrompts } from './QuickPrompts';
import { ResultCard } from './ResultCard';

interface Props {
  messages: Message[];
  loading: boolean;
  onSend: (text: string) => void;
}

function parseMessageParts(content: string) {
  const parts: Array<{ type: 'text' | 'results'; value: string }> = [];
  const regex = /<results>([\s\S]*?)<\/results>/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      const text = content.slice(lastIndex, match.index).trim();
      if (text) parts.push({ type: 'text', value: text });
    }
    parts.push({ type: 'results', value: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) parts.push({ type: 'text', value: text });
  }
  return parts;
}

export function ChatPanel({ messages, loading, onSend }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    onSend(input);
    setInput('');
  };

  const handleQuickPrompt = (prompt: string) => {
    onSend(prompt);
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800 flex-shrink-0">
        <div className="w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />
        <span className="text-sm font-medium text-zinc-200">ShopBot</span>
        <span className="text-xs text-zinc-600">powered by Claude</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-8 pb-16">
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold text-zinc-200">Shopping Assistant</h1>
              <p className="text-zinc-500 text-sm max-w-sm">
                Search, compare, and basket items across Tesco, Sainsbury's, Amazon, and eBay
              </p>
            </div>
            <QuickPrompts onSelect={handleQuickPrompt} />
          </div>
        ) : (
          messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'user' ? (
                <div className="max-w-[75%] bg-zinc-800 rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm text-zinc-100">
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[90%] space-y-3">
                  {parseMessageParts(msg.content).map((part, i) =>
                    part.type === 'results' ? (
                      <ResultCard key={i} json={part.value} onAdd={onSend} />
                    ) : (
                      <p key={i} className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {part.value}
                      </p>
                    )
                  )}
                </div>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="flex gap-1.5 px-3 py-3">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-zinc-500 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-zinc-800 flex-shrink-0">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Find me oat milk under £2..."
            disabled={loading}
            className="flex-1 bg-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 outline-none focus:ring-1 focus:ring-zinc-600 disabled:opacity-50 transition-shadow"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}
