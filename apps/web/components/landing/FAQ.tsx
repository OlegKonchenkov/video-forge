'use client';
import { useRef, useState } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';

const faqs = [
  { q: 'How long does it take to generate a video?',
    a: "Most videos render in 3–6 minutes depending on length. You'll get a real-time progress bar and an email notification when ready." },
  { q: 'What video formats do you output?',
    a: '1080p MP4 (H.264), optimised for YouTube, LinkedIn, Instagram, your website, or any platform.' },
  { q: 'Do I need any video editing skills?',
    a: 'Zero. Provide your content — URL, PDF, or text — and the AI handles script, voiceover, visuals, music, and editing.' },
  { q: 'Can I customise the visual style?',
    a: 'Yes. Multiple visual themes and voiceover styles are available. Custom branding (logo, colours) is on Pro and Agency plans.' },
  { q: 'What happens to unused credits?',
    a: 'Credits roll over for up to 3 months on Starter and Pro. Agency credits never expire.' },
  { q: 'Is there a free trial?',
    a: 'Every new account gets 1 free video credit. No credit card required to start.' },
];

export function FAQ() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="faq" ref={ref} className="py-28 px-6 bg-film-black border-t border-film-border">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <p className="section-label mb-4">Director&apos;s Notes</p>
          <h2
            className="font-display text-film-cream leading-none"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 6rem)', letterSpacing: '0.04em' }}
          >
            COMMON{' '}
            <span style={{ WebkitTextStroke: '2px #E8C547', color: 'transparent' }}>QUESTIONS</span>
          </h2>
        </motion.div>

        {/* Accordion */}
        <div className="divide-y divide-film-border border-t border-b border-film-border">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -16 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.55, delay: i * 0.07, ease: [0.22, 1, 0.36, 1] }}
            >
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-start justify-between gap-6 py-6 text-left group"
              >
                <div className="flex items-start gap-5">
                  <span
                    className="font-display text-film-amber/50 text-sm tracking-widest flex-shrink-0 mt-0.5 group-hover:text-film-amber transition-colors"
                  >
                    {String(i + 1).padStart(2, '0')} —
                  </span>
                  <span className="text-film-cream/90 font-semibold text-sm leading-snug pr-4 group-hover:text-film-cream transition-colors">
                    {faq.q}
                  </span>
                </div>
                <span
                  className={`text-film-amber flex-shrink-0 text-lg font-display transition-transform duration-300 ${open === i ? 'rotate-45' : 'rotate-0'}`}
                >
                  +
                </span>
              </button>

              <AnimatePresence>
                {open === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <p className="pb-6 pl-[4.25rem] text-sm text-film-gray-light leading-relaxed font-serif italic">
                      {faq.a}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
