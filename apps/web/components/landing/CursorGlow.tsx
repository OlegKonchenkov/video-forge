'use client';
import { useEffect, useRef } from 'react';

export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const isFirst = useRef(true);

  useEffect(() => {
    const el = glowRef.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      if (isFirst.current) {
        // First move: teleport instantly — no easing from off-screen
        el.style.transition = 'none';
        el.style.left = `${e.clientX}px`;
        el.style.top = `${e.clientY}px`;
        // Force reflow so the above takes effect before we re-enable transition
        void el.getBoundingClientRect();
        el.style.transition =
          'left 0.45s cubic-bezier(0.22,1,0.36,1), top 0.45s cubic-bezier(0.22,1,0.36,1)';
        isFirst.current = false;
      } else {
        el.style.left = `${e.clientX}px`;
        el.style.top = `${e.clientY}px`;
      }
    };

    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-[1]"
    >
      <div
        ref={glowRef}
        style={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          transform: 'translate(-50%, -50%)',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(232,197,71,0.25) 0%, rgba(232,197,71,0.08) 40%, transparent 68%)',
          pointerEvents: 'none',
          willChange: 'left, top',
        }}
      />
    </div>
  );
}
