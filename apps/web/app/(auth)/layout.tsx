export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-film-black flex items-center justify-center px-6 relative overflow-hidden">
      {/* Amber radial glow */}
      <div
        aria-hidden
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(232,197,71,0.07) 0%, transparent 65%)' }}
      />
      {/* Left vertical rule â€” desktop only */}
      <div className="hidden md:block absolute left-14 top-16 bottom-16 w-px bg-film-border" aria-hidden />
      {children}
    </div>
  );
}
