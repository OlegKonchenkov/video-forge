'use client';
import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Check } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    tier:  'STANDARD',
    sub:   'Festival Print',
    price: { mo: 29, yr: 23 },
    credits: 5,
    cta: 'Start Rolling',
    features: ['5 videos / month', 'URL, PDF, PPT & Prompt', 'AI voiceover (7 langs)', 'AI-generated visuals', '1080p MP4 download', 'Email support'],
  },
  {
    tier:  'THEATRICAL',
    sub:   'Wide Release',
    price: { mo: 79, yr: 63 },
    credits: 20,
    cta: 'Go Wide',
    popular: true,
    features: ['20 videos / month', 'Everything in Standard', 'Priority rendering queue', 'Custom branding', 'Video history & re-download', 'Priority support'],
  },
  {
    tier:  'PRESTIGE',
    sub:   'Studio Edition',
    price: { mo: 199, yr: 159 },
    credits: 60,
    cta: 'Go Studio',
    features: ['60 videos / month', 'Everything in Theatrical', 'API access (soon)', 'Team seats (up to 5)', 'White-label export', 'Dedicated support'],
  },
];

export function Pricing() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" ref={ref} className="py-28 px-6 bg-film-warm border-t border-film-border">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <p className="section-label mb-4">Pricing</p>
          <h2
            className="font-display text-film-cream leading-none"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 6.5rem)', letterSpacing: '0.04em' }}
          >
            PRODUCTION{' '}
            <span style={{ WebkitTextStroke: '2px #E8C547', color: 'transparent' }}>PACKAGES</span>
          </h2>
          <p className="mt-3 font-serif italic text-film-gray-light text-lg">
            1 credit = 1 video. No surprises.
          </p>

          {/* Annual toggle */}
          <div className="mt-8 flex items-center gap-4">
            <span className={`text-xs font-semibold tracking-widest uppercase ${!annual ? 'text-film-cream' : 'text-film-gray'}`}>Monthly</span>
            <button
              onClick={() => setAnnual(v => !v)}
              className={`relative w-11 h-5 transition-colors duration-300 ${annual ? 'bg-film-amber' : 'bg-film-border'}`}
              aria-label="Toggle annual billing"
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-film-black transition-transform duration-300 ${annual ? 'translate-x-6' : 'translate-x-0.5'}`} />
            </button>
            <span className={`text-xs font-semibold tracking-widest uppercase ${annual ? 'text-film-cream' : 'text-film-gray'}`}>
              Annual <span className="text-film-amber ml-1">— Save 20%</span>
            </span>
          </div>
        </motion.div>

        {/* Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.tier}
              initial={{ opacity: 0, y: 36 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.65, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className={`relative flex flex-col transition-transform duration-300 ${plan.popular ? 'md:-translate-y-3' : ''}`}
            >
              {plan.popular && (
                <div className="bg-film-amber px-4 py-2 text-center">
                  <span className="font-display text-film-black text-sm tracking-[0.15em]">★ MOST POPULAR</span>
                </div>
              )}

              {/* Card top — amber stripe header */}
              <div
                className={`px-8 py-5 border-x border-t ${plan.popular ? 'border-film-amber bg-film-amber/8' : 'border-film-border bg-film-card'}`}
              >
                <p className="section-label mb-1">{plan.tier}</p>
                <p className="font-serif italic text-film-gray text-sm">{plan.sub}</p>
              </div>

              {/* Price */}
              <div className={`px-8 py-6 border-x ${plan.popular ? 'border-film-amber bg-film-card' : 'border-film-border bg-film-card'}`}>
                <div className="flex items-baseline gap-1">
                  <span className="font-display text-film-amber" style={{ fontSize: '4rem', lineHeight: 1, letterSpacing: '-0.01em' }}>
                    ${annual ? plan.price.yr : plan.price.mo}
                  </span>
                  <span className="text-film-gray text-sm font-semibold">/mo</span>
                </div>
                <div
                  className="mt-3 py-2 text-center font-display text-sm tracking-widest"
                  style={{
                    background: plan.popular ? 'rgba(232,197,71,0.1)' : 'rgba(42,34,24,0.5)',
                    border: `1px solid ${plan.popular ? '#E8C547' : '#2A2218'}`,
                    color: plan.popular ? '#E8C547' : '#7A746E',
                    letterSpacing: '0.15em',
                  }}
                >
                  {plan.credits} VIDEOS / MONTH
                </div>
              </div>

              {/* Features */}
              <div className={`flex-1 px-8 pt-6 pb-8 border-x border-b ${plan.popular ? 'border-film-amber bg-film-card' : 'border-film-border bg-film-card'}`}>
                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-3 text-sm text-film-gray-light">
                      <Check className="w-4 h-4 text-film-amber mt-0.5 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className={plan.popular ? 'btn-amber w-full justify-center' : 'btn-ghost w-full justify-center'}
                >
                  {plan.cta} →
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

        {/* One-off */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-8 flex flex-col md:flex-row items-center justify-between gap-5 px-8 py-5 border border-film-border bg-film-card"
        >
          <div>
            <p className="font-display text-film-cream tracking-wider text-lg">ONE-OFF SCREENING</p>
            <p className="text-sm text-film-gray-light mt-1 font-serif italic">No subscription. Just one video. $9.</p>
          </div>
          <Link href="/signup" className="btn-ghost whitespace-nowrap !text-film-amber !border-film-amber/40 hover:!border-film-amber">
            Pay $9 per Video →
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
