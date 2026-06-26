import { useState } from "react";
import { Phone, Video } from "lucide-react";
import { ElevenLabsChat } from "./components/ElevenLabsChat";
import { MeetingsPanel } from "./components/MeetingsPanel";

type Tab = "voice" | "meetings";

const TABS: { id: Tab; label: string; icon: typeof Phone }[] = [
  { id: "voice", label: "Voice", icon: Phone },
  { id: "meetings", label: "Meetings", icon: Video },
];

function App() {
  const [tab, setTab] = useState<Tab>("voice");

  return (
    // Full-screen dark shell. ElevenLabsChat manages body.os1-theme for its orange bg.
    <div className="fixed inset-0 flex flex-col bg-zinc-950 text-zinc-100">
      {/* Top nav bar */}
      <nav className="flex items-center h-11 px-4 border-b border-zinc-800 shrink-0 z-50 bg-zinc-950/90 backdrop-blur">
        <span className="text-sm font-bold tracking-tight text-zinc-200 mr-5">OS1</span>
        <div className="flex gap-0.5">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                tab === id
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {/* Tab panels — mount/unmount to avoid Three.js canvas conflicts */}
      <div className="flex-1 overflow-hidden">
        {tab === "voice" && <ElevenLabsChat />}
        {tab === "meetings" && <MeetingsPanel />}
      </div>
    </div>
  );
}

export default App;
