import { useState, useCallback, useEffect, useRef } from 'react';
import type { Message, Basket } from '../types/shopping';

const API_BASE = import.meta.env.DEV ? 'http://127.0.0.1:18792' : '';

export function useShoppingChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [basket, setBasket] = useState<Basket>({ items: [], byStore: {} as Basket['byStore'], total: 0 });
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchBasket = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/basket`);
      if (res.ok) setBasket(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchBasket();
    pollRef.current = setInterval(fetchBasket, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchBasket]);

  const removeItem = useCallback(async (id: string) => {
    await fetch(`${API_BASE}/api/basket/${id}`, { method: 'DELETE' });
    fetchBasket();
  }, [fetchBasket]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMsg];
    setMessages(nextMessages);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextMessages.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      const assistantMsg: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: data.content || data.error || 'Sorry, something went wrong.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, assistantMsg]);
      fetchBasket();
    } catch {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'Connection error — make sure the shopping gateway is running on port 18792.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, fetchBasket]);

  return { messages, basket, loading, sendMessage, removeItem };
}
