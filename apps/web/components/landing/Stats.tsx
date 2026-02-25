'use client';
import { useRef, useEffect, useState } from 'react';
import { useInView } from 'framer-motion';

const stats = [
  { value: 2400, suffix: '+', label: 'Videos Generated' },
  { value: 5,    prefix: '<', suffix: ' MIN', label: 'Average Render Time' },
  { value: 30,   suffix: '×', label: 'Faster Than Manual' },
];

function Counter({ to, prefix = '', suffix = '' }: { to: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1600;
    const startTime = performance.now();
    function frame(now: number) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setCount(Math.round(eased * to));
      if (progress < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }, [inView, to]);

  return (
    <span ref={ref}>
      {prefix}{count}{suffix}
    </span>
  );
}

export function Stats() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });

  return (
    <section ref={ref} className="py-24 px-6 border-t border-b border-film-border bg-film-black relative overflow-hidden">
      {/* Amber glow center */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, rgba(232,197,71,0.04) 0%, transparent 60%)' }}
      />

      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-film-border relative">
        {stats.map((s, i) => (
          <div key={s.label} className="px-6 sm:px-8 md:px-16 py-10 sm:py-6 text-center">
            <div
              className="font-display text-film-amber leading-none"
              style={{ fontSize: 'clamp(3.5rem, 9vw, 8rem)', letterSpacing: '0.02em' }}
            >
              {inView ? (
                <Counter to={s.value} prefix={s.prefix} suffix={s.suffix} />
              ) : (
                <span>0</span>
              )}
            </div>
            <p className="mt-2 text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-film-gray-light">
              {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
