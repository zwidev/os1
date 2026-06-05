import { BasketSidebar } from './components/BasketSidebar';
import { ChatPanel } from './components/ChatPanel';
import { useShoppingChat } from './hooks/useShoppingChat';

export default function App() {
  const { messages, basket, loading, sendMessage, removeItem } = useShoppingChat();

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      <main className="flex-1 min-w-0">
        <ChatPanel messages={messages} loading={loading} onSend={sendMessage} />
      </main>
      <BasketSidebar basket={basket} onRemove={removeItem} />
    </div>
  );
}
