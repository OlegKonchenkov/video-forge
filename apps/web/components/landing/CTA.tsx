'use client';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import Link from 'next/link';

export function CTASection() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section ref={ref} className="bg-film-amber border-t border-film-amber-dim overflow-hidden relative">

      {/* Decorative film-strip top */}
      <div className="flex items-center gap-2 px-4 py-2 bg-film-amber-dim/40 overflow-hidden">
        {Array.from({ length: 80 }).map((_, i) => (
          <div key={i} className="w-2 h-1.5 flex-shrink-0 bg-film-black/20 rounded-sm" />
        ))}
      </div>

      <div className="max-w-6xl mx-auto px-6 py-24 text-center">

        {/* Label */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="text-[0.65rem] font-semibold tracking-[0.3em] uppercase text-film-black/50 mb-6"
        >
          Your first video is free
        </motion.p>

        {/* Headline */}
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.85, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-film-black leading-none"
          style={{ fontSize: 'clamp(3.5rem, 14vw, 12rem)', letterSpacing: '0.02em', lineHeight: 0.9 }}
        >
          LIGHTS.
          <br />
          <span
            style={{
              WebkitTextStroke: '3px rgba(8,8,8,0.5)',
              color: 'transparent',
            }}
          >
            CAMERA.
          </span>
          <br />
          ACTION.
        </motion.h2>

        {/* Subtext */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="mt-8 font-serif italic text-film-black/70 text-xl max-w-md mx-auto"
        >
          No credit card required. No editing software. No waiting.
        </motion.p>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, delay: 0.5 }}
          className="mt-10"
        >
          <Link
            href="/signup"
            className="inline-flex items-center gap-3 px-10 py-4 bg-film-black text-film-amber font-semibold text-[0.78rem] tracking-[0.18em] uppercase hover:bg-film-warm transition-colors duration-200"
          >
            → Create My First Video Free
          </Link>
          <p className="mt-4 text-[0.6rem] tracking-[0.2em] uppercase text-film-black/45 font-semibold">
            Takes 30 seconds · No card required
          </p>
        </motion.div>
      </div>

      {/* Decorative film-strip bottom */}
      <div className="flex items-center gap-2 px-4 py-2 bg-film-amber-dim/40 overflow-hidden">
        {Array.from({ length: 80 }).map((_, i) => (
          <div key={i} className="w-2 h-1.5 flex-shrink-0 bg-film-black/20 rounded-sm" />
        ))}
      </div>
    </section>
  );
}
