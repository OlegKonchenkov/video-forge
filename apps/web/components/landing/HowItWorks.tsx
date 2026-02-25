'use client';
import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { Upload, Sparkles, Download } from 'lucide-react';

const acts = [
  {
    roman: 'ACT I',
    num: '01',
    icon: Upload,
    title: 'Drop Your Source',
    desc: 'Paste a website URL, upload a PDF or PowerPoint, or write a short prompt. Any format, any size.',
  },
  {
    roman: 'ACT II',
    num: '02',
    icon: Sparkles,
    title: 'AI Runs the Set',
    desc: 'Script. Voiceover. Visuals. Music. Editing. Our pipeline handles every step — no human in the loop.',
  },
  {
    roman: 'ACT III',
    num: '03',
    icon: Download,
    title: 'Roll Credits',
    desc: 'Your 1080p MP4 is ready in under 5 minutes. Download and publish anywhere.',
  },
];

export function HowItWorks() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });

  return (
    <section id="how-it-works" ref={ref} className="py-28 px-6 bg-film-warm border-t border-film-border">
      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-20"
        >
          <p className="section-label mb-4">The Process</p>
          <div className="flex items-end gap-5 flex-wrap">
            <h2
              className="font-display leading-none text-film-cream"
              style={{ fontSize: 'clamp(3rem, 8vw, 7rem)', letterSpacing: '0.03em' }}
            >
              THREE STEPS.
            </h2>
            <span
              className="font-display leading-none"
              style={{
                fontSize: 'clamp(3rem, 8vw, 7rem)',
                letterSpacing: '0.03em',
                WebkitTextStroke: '2px #E8C547',
                color: 'transparent',
              }}
            >
              ONE VIDEO.
            </span>
          </div>
        </motion.div>

        {/* Acts grid */}
        <div className="grid md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-film-border border-t border-b border-film-border">
          {acts.map((act, i) => {
            const Icon = act.icon;
            return (
              <motion.div
                key={act.num}
                initial={{ opacity: 0, y: 32 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
                className="relative p-10 md:p-12 group overflow-hidden"
              >
                {/* Ghost step number — watermark behind */}
                <span
                  aria-hidden
                  className="absolute -top-4 -left-2 font-display text-film-cream/[0.04] pointer-events-none select-none leading-none"
                  style={{ fontSize: 'clamp(7rem, 18vw, 14rem)', letterSpacing: '-0.02em' }}
                >
                  {act.num}
                </span>

                {/* ACT label */}
                <p className="section-label mb-6 relative">{act.roman}</p>

                {/* Icon */}
                <div className="relative w-11 h-11 border border-film-border flex items-center justify-center mb-6 group-hover:border-film-amber transition-colors duration-300">
                  <Icon className="w-5 h-5 text-film-amber" />
                </div>

                {/* Title */}
                <h3
                  className="font-display text-film-cream relative mb-4 leading-none"
                  style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', letterSpacing: '0.04em' }}
                >
                  {act.title.toUpperCase()}
                </h3>

                {/* Description */}
                <p className="text-sm text-film-gray-light leading-relaxed relative max-w-xs">
                  {act.desc}
                </p>

                {/* Bottom amber line on hover */}
                <div className="absolute bottom-0 left-0 w-0 h-px bg-film-amber group-hover:w-full transition-all duration-500 ease-out" />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
