'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Send, Mail, MessageSquare, Clock } from 'lucide-react';

function MarketingNav() {
  return (
    <header className="border-b border-film-border bg-film-black sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="inline-flex items-baseline gap-0.5">
          <span className="font-display text-xl tracking-wider text-film-cream">VIDEO</span>
          <span className="font-display text-xl tracking-wider text-film-amber">FORGE</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/pricing" className="text-film-gray hover:text-film-cream font-sans text-sm transition-colors">Pricing</Link>
          <Link href="/login" className="btn-ghost !py-2 !px-4 !text-xs">Sign in</Link>
          <Link href="/signup" className="btn-amber !py-2 !px-4 !text-xs">Start free</Link>
        </nav>
      </div>
    </header>
  );
}

const SUBJECTS = [
  'General inquiry',
  'Sales / Enterprise',
  'Technical support',
  'Billing question',
  'Partnership',
  'Other',
];

export default function ContactPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('General inquiry');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    // Simulate send (replace with real API call)
    await new Promise(r => setTimeout(r, 1000));
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="min-h-screen bg-film-black">
      <MarketingNav />

      <main className="max-w-5xl mx-auto px-6 py-16">

        {/* Header */}
        <div className="mb-14 text-center">
          <span className="section-label mb-3 block">Contact</span>
          <h1 className="font-display text-5xl md:text-6xl tracking-wider text-film-cream mb-4">GET IN TOUCH</h1>
          <p className="font-serif italic text-film-gray-light max-w-md mx-auto">
            Questions, partnerships, or just want to say hello — we&apos;re here.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-8">

          {/* Info panel */}
          <div className="md:col-span-2 space-y-5">
            {[
              {
                icon: Mail,
                label: 'Email',
                value: 'hello@videoforge.app',
                href: 'mailto:hello@videoforge.app',
              },
              {
                icon: MessageSquare,
                label: 'Support',
                value: 'support@videoforge.app',
                href: 'mailto:support@videoforge.app',
              },
              {
                icon: Clock,
                label: 'Response time',
                value: 'Within 24 hours on weekdays',
                href: null,
              },
            ].map(({ icon: Icon, label, value, href }) => (
              <div key={label} className="film-card p-5 flex items-start gap-4">
                <div className="w-8 h-8 border border-film-border flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-film-amber" />
                </div>
                <div>
                  <p className="text-[0.65rem] font-sans font-bold tracking-widest uppercase text-film-gray mb-0.5">{label}</p>
                  {href ? (
                    <a href={href} className="text-film-cream font-sans text-sm link-amber">{value}</a>
                  ) : (
                    <p className="text-film-cream font-sans text-sm">{value}</p>
                  )}
                </div>
              </div>
            ))}

            <div className="film-card p-5">
              <span className="section-label mb-2 block">Also useful</span>
              <ul className="space-y-2 text-sm font-sans">
                <li><Link href="/pricing" className="text-film-gray-light hover:text-film-amber transition-colors link-amber">Pricing & plans →</Link></li>
                <li><Link href="/privacy" className="text-film-gray-light hover:text-film-amber transition-colors link-amber">Privacy policy →</Link></li>
                <li><Link href="/terms" className="text-film-gray-light hover:text-film-amber transition-colors link-amber">Terms of service →</Link></li>
              </ul>
            </div>
          </div>

          {/* Contact form */}
          <div className="md:col-span-3 film-card p-8">
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center space-y-4">
                <div className="w-12 h-12 border border-film-amber/40 flex items-center justify-center">
                  <span className="text-film-amber font-display text-2xl">✓</span>
                </div>
                <h2 className="font-display text-2xl tracking-wider text-film-cream">MESSAGE SENT</h2>
                <p className="text-film-gray font-sans text-sm max-w-xs">
                  Thank you for reaching out. We&apos;ll get back to you within 24 hours.
                </p>
                <button
                  onClick={() => { setSent(false); setName(''); setEmail(''); setMessage(''); }}
                  className="btn-ghost !py-2 !px-4 !text-xs mt-2"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="font-display text-2xl tracking-wider text-film-cream mb-6">SEND A MESSAGE</h2>

                {error && (
                  <div className="p-3 border border-red-800/50 bg-red-950/30 text-red-400 text-sm font-sans">{error}</div>
                )}

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
                      Name
                    </label>
                    <input
                      required value={name} onChange={e => setName(e.target.value)}
                      placeholder="Jane Smith"
                      className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
                      Email
                    </label>
                    <input
                      required type="email" value={email} onChange={e => setEmail(e.target.value)}
                      placeholder="you@company.com"
                      className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
                    Subject
                  </label>
                  <select
                    value={subject} onChange={e => setSubject(e.target.value)}
                    className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors"
                  >
                    {SUBJECTS.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-sans font-semibold tracking-widest uppercase text-film-gray-light mb-2">
                    Message
                  </label>
                  <textarea
                    required value={message} onChange={e => setMessage(e.target.value)}
                    rows={6}
                    placeholder="Tell us what you need…"
                    className="w-full px-4 py-3 bg-film-warm border border-film-border text-film-cream placeholder-film-gray font-sans text-sm focus:outline-none focus:border-film-amber/60 transition-colors resize-none"
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-amber disabled:opacity-40">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {loading ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-film-border mt-16">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-baseline gap-0.5">
            <span className="font-display text-lg tracking-wider text-film-cream">VIDEO</span>
            <span className="font-display text-lg tracking-wider text-film-amber">FORGE</span>
          </Link>
          <div className="flex gap-6 text-film-gray font-sans text-xs">
            <Link href="/privacy" className="hover:text-film-cream transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-film-cream transition-colors">Terms</Link>
            <Link href="/contact" className="text-film-amber">Contact</Link>
          </div>
          <p className="text-film-gray font-sans text-xs">© {new Date().getFullYear()} VideoForge</p>
        </div>
      </footer>
    </div>
  );
}
