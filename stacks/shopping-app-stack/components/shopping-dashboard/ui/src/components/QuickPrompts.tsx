const PROMPTS = [
  'Find me oat milk under £2',
  'Compare semi-skimmed milk prices',
  'Show me red wine under £10',
  'Find wireless headphones under £50',
  "What's in my basket?",
  'Show me free-range chicken',
];

interface Props {
  onSelect: (prompt: string) => void;
}

export function QuickPrompts({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2 w-full max-w-md">
      {PROMPTS.map(prompt => (
        <button
          key={prompt}
          onClick={() => onSelect(prompt)}
          className="text-left text-xs text-zinc-400 hover:text-zinc-200 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/50 rounded-xl px-3 py-3 transition-colors leading-snug"
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
