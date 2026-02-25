'use client';
import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Globe, FileText, Presentation, MessageSquare } from 'lucide-react';

const types = [
  {
    icon: Globe,
    label: 'SCENE 01',
    title: 'Website URL',
    tag: 'Most Popular',
    tagColor: '#E8C547',
    desc: 'Paste any URL. We scrape the page, extract key messages, and build the entire video around your product.',
    example: 'https://yourproduct.com',
  },
  {
    icon: FileText,
    label: 'SCENE 02',
    title: 'PDF Document',
    tag: 'Great for B2B',
    tagColor: '#a78bfa',
    desc: 'Upload brochures, proposals, or case studies. We extract the narrative and turn it into a compelling video.',
    example: 'product-brochure.pdf',
  },
  {
    icon: Presentation,
    label: 'SCENE 03',
    title: 'PowerPoint',
    tag: 'Fast & Easy',
    tagColor: '#fb923c',
    desc: 'Drop your slide deck. We use your existing structure and talking points to build the perfect video version.',
    example: 'pitch-deck.pptx',
  },
  {
    icon: MessageSquare,
    label: 'SCENE 04',
    title: 'Text Prompt',
    tag: 'Max Flexibility',
    tagColor: '#4ade80',
    desc: 'Describe your product in plain English. Our AI researches, writes, and structures the entire video from scratch.',
    example: '"A SaaS that automates HR workflows..."',
  },
];

export function InputTypes() {
  const ref    = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  const [active, setActive] = useState(0);

  return (
    <section id="features" ref={ref} className="py-28 px-6 bg-film-black">
      <div className="max-w-7xl mx-auto">

        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <p className="section-label mb-4">Source Material</p>
          <h2
            className="font-display text-film-cream leading-none"
            style={{ fontSize: 'clamp(2.5rem, 7vw, 6.5rem)', letterSpacing: '0.04em' }}
          >
            START FROM{' '}
            <span
              style={{
                WebkitTextStroke: '2px #E8C547',
                color: 'transparent',
              }}
            >
              ANYTHING
            </span>
          </h2>
          <p className="mt-4 font-serif italic text-film-gray-light text-lg max-w-xl">
            No special format required.
          </p>
        </motion.div>

        {/* Clapperboard cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {types.map((t, i) => {
            const Icon = t.icon;
            const isActive = active === i;
            return (
              <motion.button
                key={t.title}
                onClick={() => setActive(i)}
                initial={{ opacity: 0, y: 32 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.65, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
                className={`text-left transition-all duration-300 ${
                  isActive ? 'scale-[1.02]' : 'hover:scale-[1.01]'
                }`}
              >
                {/* Clapperboard header — diagonal stripe pattern */}
                <div
                  className="px-4 py-2.5 flex items-center justify-between"
                  style={{
                    background: isActive
                      ? `repeating-linear-gradient(45deg, ${t.tagColor}, ${t.tagColor} 8px, #141209 8px, #141209 16px)`
                      : 'repeating-linear-gradient(45deg, #2A2218, #2A2218 8px, #141209 8px, #141209 16px)',
                    borderBottom: `1px solid ${isActive ? t.tagColor : '#2A2218'}`,
                  }}
                >
                  <span
                    className="font-display text-xs tracking-widest"
                    style={{ color: isActive ? '#141209' : '#B0A89E' }}
                  >
                    {t.label}
                  </span>
                  <span
                    className="text-[0.58rem] font-semibold tracking-wider uppercase px-2 py-0.5"
                    style={{
                      background: `${t.tagColor}22`,
                      color: t.tagColor,
                      border: `1px solid ${t.tagColor}44`,
                    }}
                  >
                    {t.tag}
                  </span>
                </div>

                {/* Card body */}
                <div
                  className={`p-6 border-x border-b transition-colors duration-300 ${
                    isActive ? 'border-film-amber/50 bg-film-card' : 'border-film-border bg-film-card'
                  }`}
                  style={{
                    boxShadow: isActive ? `0 0 30px rgba(232,197,71,0.08)` : 'none',
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-10 h-10 flex items-center justify-center mb-5 border transition-colors duration-300"
                    style={{
                      borderColor: isActive ? t.tagColor : '#2A2218',
                      background: isActive ? `${t.tagColor}12` : 'transparent',
                    }}
                  >
                    <Icon className="w-5 h-5" style={{ color: isActive ? t.tagColor : '#B0A89E' }} />
                  </div>

                  {/* Title */}
                  <h3
                    className="font-display tracking-wider mb-3 leading-none"
                    style={{
                      fontSize: '1.3rem',
                      color: isActive ? '#F0EBE1' : '#B0A89E',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {t.title.toUpperCase()}
                  </h3>

                  {/* Desc */}
                  <p className="text-sm text-film-gray-light leading-relaxed mb-4">{t.desc}</p>

                  {/* Example */}
                  <code
                    className="text-[0.62rem] block px-2 py-1.5 font-mono"
                    style={{
                      background: '#080808',
                      border: `1px solid ${isActive ? t.tagColor + '44' : '#2A2218'}`,
                      color: isActive ? t.tagColor : '#B0A89E',
                    }}
                  >
                    {t.example}
                  </code>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
