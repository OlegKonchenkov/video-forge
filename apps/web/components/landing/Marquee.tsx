export function Marquee() {
  const items = [
    'Script Generation',
    'AI Voiceover',
    'Visual Generation',
    'Remotion Render',
    'Instant Download',
    'Zero Editing Skills',
    'URL · PDF · PPT · Prompt',
  ];

  // Double for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="bg-film-amber py-3 overflow-hidden border-y border-film-amber-dim select-none">
      <div className="marquee-track flex items-center">
        {doubled.map((item, i) => (
          <span
            key={i}
            className="flex items-center text-film-black font-semibold text-[0.7rem] tracking-[0.22em] uppercase whitespace-nowrap"
          >
            {item}
            <span className="mx-6 text-film-warm/50 text-[0.5rem]">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}
