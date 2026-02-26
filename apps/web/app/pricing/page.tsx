import Link from 'next/link';
import { CheckCircle, ArrowRight } from 'lucide-react';

const PLANS = [
  {
    name: 'STARTER',
    price: 29,
    credits: 5,
    desc: 'For solo founders testing AI video ads',
    features: ['5 AI videos / month', 'All 4 input types', '1080p HD output', '14-day history', 'Email support'],
    cta: 'Start Free Trial',
    popular: false,
  },
  {
    name: 'PRO',
    price: 79,
    credits: 20,
    desc: 'For growing teams running paid campaigns',
    features: ['20 AI videos / month', 'Priority rendering', '4K output', 'Custom brand voice', 'Priority support', 'Analytics dashboard'],
    cta: 'Get Pro',
    popular: true,
  },
  {
    name: 'AGENCY',
    price: 199,
    credits: 60,
    desc: 'For agencies and high-volume advertisers',
    features: ['60 AI videos / month', 'Batch processing', 'API access', 'White-label output', 'Dedicated account manager', 'SLA guarantee'],
    cta: 'Talk to Sales',
    popular: false,
  },
];

const FAQS = [
  { q: 'Is there a free trial?', a: 'Yes — all new accounts get 1 free video credit, no card required. You can generate your first ad and see the quality before committing.' },
  { q: 'What counts as one credit?', a: 'One credit = one generated video, regardless of length or input type. Unused credits reset at each billing cycle anniversary.' },
  { q: 'Can I cancel anytime?', a: 'Absolutely. Cancel from your billing page and you keep access until the end of your paid period.' },
  { q: 'Do you support custom branding?', a: 'Pro and Agency plans include custom brand voice and color palette support. Agency adds white-label output with your logo.' },
  { q: 'What input formats do you support?', a: 'Website URL, PDF document, PowerPoint slide deck, or a plain-text description. We extract the key messages and handle the rest.' },
];

function MarketingNav() {
  return (
    <header className="border-b border-film-border bg-film-black sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="inline-flex items-baseline gap-0.5">
          <span className="font-display text-xl tracking-wider text-film-cream">VIDEO</span>
          <span className="font-display text-xl tracking-wider text-film-amber">FORGE</span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link href="/pricing" className="text-film-amber font-sans text-sm font-medium">Pricing</Link>
          <Link href="/contact" className="text-film-gray hover:text-film-cream font-sans text-sm transition-colors">Contact</Link>
          <Link href="/login" className="btn-ghost !py-2 !px-4 !text-xs">Sign in</Link>
          <Link href="/signup" className="btn-amber !py-2 !px-4 !text-xs">Start free</Link>
        </nav>
      </div>
    </header>
  );
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-film-black">
      <MarketingNav />

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-20 pb-16 text-center">
        <span className="section-label mb-4 block">Pricing</span>
        <h1 className="font-display text-6xl md:text-7xl tracking-wider text-film-cream mb-4">
          SIMPLE, HONEST<br />
          <span className="text-film-amber">PRICING</span>
        </h1>
        <p className="font-serif italic text-film-gray-light text-lg max-w-xl mx-auto">
          No hidden fees. No per-seat licensing. Pay for videos generated, not for seats at a table.
        </p>
        <div className="flex items-center justify-center gap-3 mt-6">
          <span className="h-px w-8 bg-film-border" />
          <span className="text-film-gray font-sans text-xs tracking-widest uppercase">First video free · No card required</span>
          <span className="h-px w-8 bg-film-border" />
        </div>
      </section>

      {/* Plans grid */}
      <section className="max-w-5xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-0 border border-film-border">
          {PLANS.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative p-8 flex flex-col ${
                plan.popular
                  ? 'bg-film-warm border-x border-film-amber/30'
                  : 'bg-film-black'
              } ${i < PLANS.length - 1 ? 'md:border-r border-film-border' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-film-amber">
                  <span className="text-[0.6rem] font-sans font-bold tracking-widest uppercase text-film-black">Most Popular</span>
                </div>
              )}

              <div className="mb-6">
                <h2 className="font-display text-2xl tracking-wider text-film-cream">{plan.name}</h2>
                <p className="text-film-gray font-sans text-xs mt-1">{plan.desc}</p>
              </div>

              <div className="flex items-baseline gap-1 mb-6">
                <span className="font-display text-5xl tracking-wide text-film-amber">${plan.price}</span>
                <span className="text-film-gray font-sans text-sm">/month</span>
              </div>

              <div className="text-film-gray-light font-sans text-xs tracking-widest uppercase mb-5">
                {plan.credits} video credits / month
              </div>

              <ul className="space-y-2.5 mb-8 flex-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm font-sans text-film-gray-light">
                    <CheckCircle className="w-3.5 h-3.5 text-film-amber flex-shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={plan.popular ? 'btn-amber justify-center' : 'btn-ghost justify-center'}
              >
                {plan.cta} <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>

        {/* One-off credits */}
        <div className="mt-6 film-card p-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="section-label mb-1 block">Pay-as-you-go</span>
            <h3 className="font-display text-xl tracking-wider text-film-cream">ONE-OFF CREDIT — $9</h3>
            <p className="text-film-gray font-sans text-sm mt-1">Need one video without a subscription? Buy a single credit.</p>
          </div>
          <Link href="/signup" className="btn-ghost flex-shrink-0">
            Buy 1 Credit <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-film-border bg-film-warm/30">
        <div className="max-w-3xl mx-auto px-6 py-20">
          <span className="section-label mb-3 block text-center">FAQ</span>
          <h2 className="font-display text-4xl tracking-wider text-film-cream text-center mb-12">
            COMMON QUESTIONS
          </h2>
          <div className="space-y-0 border border-film-border">
            {FAQS.map(({ q, a }, i) => (
              <details key={i} className={`group p-6 ${i < FAQS.length - 1 ? 'border-b border-film-border' : ''}`}>
                <summary className="flex items-center justify-between cursor-pointer list-none">
                  <span className="font-sans font-semibold text-film-cream text-sm">{q}</span>
                  <span className="text-film-amber font-display text-xl group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="mt-3 text-film-gray font-sans text-sm leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-film-border">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <Link href="/" className="inline-flex items-baseline gap-0.5">
            <span className="font-display text-lg tracking-wider text-film-cream">VIDEO</span>
            <span className="font-display text-lg tracking-wider text-film-amber">FORGE</span>
          </Link>
          <div className="flex gap-6 text-film-gray font-sans text-xs">
            <Link href="/privacy" className="hover:text-film-cream transition-colors">Privacy</Link>
            <Link href="/terms" className="hover:text-film-cream transition-colors">Terms</Link>
            <Link href="/contact" className="hover:text-film-cream transition-colors">Contact</Link>
          </div>
          <p className="text-film-gray font-sans text-xs">© {new Date().getFullYear()} VideoForge</p>
        </div>
      </footer>
    </div>
  );
}
