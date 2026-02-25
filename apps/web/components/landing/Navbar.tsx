'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';

const links = [
  { label: 'Features',     href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing',      href: '#pricing' },
  { label: 'FAQ',          href: '#faq' },
];

export function Navbar() {
  const [scrolled,    setScrolled]    = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);

  /* ── Scroll detection ────────────────────────────────── */
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* ── Close on viewport resize to desktop ─────────────── */
  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMobileOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /* ── Lock body scroll when mobile menu open ──────────── */
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <motion.nav
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled || mobileOpen
          ? 'bg-film-black/98 backdrop-blur-xl border-b border-film-border'
          : ''
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="font-display text-[1.65rem] tracking-widest leading-none select-none"
        >
          <span className="text-film-cream">VIDEO</span>
          <span className="text-film-amber">FORGE</span>
        </Link>

        {/* Desktop nav links */}
        <ul className="hidden md:flex items-center gap-10">
          {links.map(({ label, href }) => (
            <li key={label}>
              <Link
                href={href}
                className="link-amber text-[0.62rem] font-semibold tracking-[0.22em] uppercase text-film-gray hover:text-film-cream transition-colors duration-200"
              >
                {label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <Link
            href="/login"
            className="hidden md:block text-[0.62rem] font-semibold tracking-[0.22em] uppercase text-film-gray hover:text-film-cream transition-colors"
          >
            Sign In
          </Link>
          <Link href="/signup" className="hidden sm:inline-flex btn-amber !py-2 !px-5 !text-[0.62rem]">
            Start Free →
          </Link>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 text-film-cream hover:text-film-amber transition-colors"
            onClick={() => setMobileOpen(v => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu panel */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="md:hidden overflow-hidden bg-film-black/98 border-t border-film-border"
          >
            <div className="px-5 py-8 flex flex-col gap-6">

              {/* Nav links — large Bebas Neue for easy tap */}
              <ul className="flex flex-col gap-5">
                {links.map(({ label, href }) => (
                  <li key={label}>
                    <Link
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className="font-display text-2xl tracking-[0.08em] text-film-cream hover:text-film-amber transition-colors duration-200 block py-1"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="h-px bg-film-border" />

              {/* CTAs */}
              <div className="flex flex-col gap-3">
                <Link
                  href="/signup"
                  onClick={() => setMobileOpen(false)}
                  className="btn-amber justify-center text-center"
                >
                  → Start Free
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="text-center text-[0.65rem] font-semibold tracking-[0.2em] uppercase text-film-gray hover:text-film-cream transition-colors py-3"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
