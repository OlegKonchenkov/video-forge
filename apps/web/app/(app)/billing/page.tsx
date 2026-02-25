'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { motion } from 'framer-motion';
import { CreditCard, CheckCircle, Loader2, ArrowRight } from 'lucide-react';

const PLANS = [
  {
    id: 'starter',
    name: 'STARTER',
    price: 29,
    credits: 5,
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? '',
    features: ['5 AI videos / month', 'All input types', '1080p HD', 'Email support'],
  },
  {
    id: 'pro',
    name: 'PRO',
    price: 79,
    credits: 20,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? '',
    popular: true,
    features: ['20 AI videos / month', 'Priority rendering', '4K output', 'Custom branding', 'Priority support'],
  },
  {
    id: 'agency',
    name: 'AGENCY',
    price: 199,
    credits: 60,
    priceId: process.env.NEXT_PUBLIC_STRIPE_AGENCY_PRICE_ID ?? '',
    features: ['60 AI videos / month', 'Batch processing', 'API access', 'Dedicated support', 'White-label'],
  },
];

export default function BillingPage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [profile, setProfile] = useState<{ credits: number; plan: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from('profiles').select('credits, plan').eq('id', user.id).single();
      setProfile(data);
      setLoading(false);
    }
    load();
  }, []);

  async function handleCheckout(priceId: string, planId: string) {
    if (!priceId) { alert('Stripe price ID not configured.'); return; }
    setCheckoutLoading(planId);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId, userId: user?.id }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err: unknown) {
      alert('Checkout failed: ' + (err as Error).message);
      setCheckoutLoading(null);
    }
  }

  async function handleBuyCredits() {
    setCheckoutLoading('credits');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const res = await fetch('/api/stripe/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId: process.env.NEXT_PUBLIC_STRIPE_CREDITS_PRICE_ID,
          userId: user?.id,
          mode: 'payment',
          quantity: 1,
        }),
      });
      const { url, error } = await res.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err: unknown) {
      alert('Checkout failed: ' + (err as Error).message);
      setCheckoutLoading(null);
    }
  }

  const currentPlan = PLANS.find(p => p.id === profile?.plan) ?? null;
  const creditsPercent = currentPlan
    ? Math.round(((profile?.credits ?? 0) / currentPlan.credits) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-10">

      {/* Header */}
      <div className="border-b border-film-border pb-6">
        <span className="section-label mb-2 block">Account</span>
        <h1 className="font-display text-4xl tracking-wider text-film-cream">BILLING</h1>
        <p className="text-film-gray font-sans text-sm mt-1">Manage your plan and credits</p>
      </div>

      {/* Current Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="film-card p-6"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[0.6rem] font-sans font-bold tracking-widest uppercase text-film-gray mb-1">Current Plan</p>
            {loading ? (
              <div className="h-8 w-32 bg-film-warm animate-pulse" />
            ) : (
              <span className="font-display text-3xl tracking-wider text-film-cream capitalize">
                {profile?.plan ?? 'Free'}
              </span>
            )}
          </div>
          <div className="text-right">
            <p className="text-[0.6rem] font-sans font-bold tracking-widest uppercase text-film-gray mb-1">Credits Remaining</p>
            {loading ? (
              <div className="h-8 w-20 bg-film-warm animate-pulse" />
            ) : (
              <span className="font-display text-3xl tracking-wider text-film-amber">{profile?.credits ?? 0}</span>
            )}
          </div>
        </div>

        {!loading && currentPlan && (
          <div className="mt-4">
            <div className="flex justify-between text-[0.65rem] font-sans text-film-gray mb-1">
              <span>{profile?.credits} remaining</span>
              <span>{currentPlan.credits} / month</span>
            </div>
            <div className="h-0.5 bg-film-border overflow-hidden">
              <div className="h-full bg-film-amber transition-all" style={{ width: `${creditsPercent}%` }} />
            </div>
          </div>
        )}

        {/* One-off credits */}
        <div className="mt-6 flex items-center justify-between p-4 bg-film-warm border border-film-border">
          <div>
            <p className="text-film-cream font-sans text-sm font-medium">Need more videos now?</p>
            <p className="text-film-gray font-sans text-xs mt-0.5">Buy 1 video credit for $9 â€” no subscription</p>
          </div>
          <button
            onClick={handleBuyCredits}
            disabled={checkoutLoading === 'credits'}
            className="btn-ghost !py-2 !px-4 !text-[0.7rem] disabled:opacity-40"
          >
            {checkoutLoading === 'credits' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CreditCard className="w-3.5 h-3.5" />
            )}
            Buy Credit
          </button>
        </div>
      </motion.div>

      {/* Plans */}
      <div>
        <span className="section-label mb-4 block">Upgrade Your Plan</span>
        <div className="grid md:grid-cols-3 gap-5">
          {PLANS.map((plan, i) => {
            const isCurrent = profile?.plan === plan.id;
            const isLoading = checkoutLoading === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`relative film-card p-6 ${plan.popular ? 'border-film-amber/50' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-[0.6rem] font-sans font-bold tracking-widest uppercase bg-film-amber text-film-black">
                      Most Popular
                    </span>
                  </div>
                )}
                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <span className="px-3 py-1 text-[0.6rem] font-sans font-bold tracking-widest uppercase bg-film-warm border border-film-amber/40 text-film-amber">
                      Current
                    </span>
                  </div>
                )}

                <h3 className="font-display text-2xl tracking-wider text-film-cream">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2 mb-5">
                  <span className="font-display text-4xl tracking-wide text-film-amber">${plan.price}</span>
                  <span className="text-film-gray font-sans text-xs">/month</span>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-xs font-sans text-film-gray-light">
                      <CheckCircle className="w-3.5 h-3.5 text-film-amber flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => !isCurrent && handleCheckout(plan.priceId, plan.id)}
                  disabled={isCurrent || isLoading}
                  className={`w-full flex items-center justify-center gap-2 ${
                    isCurrent
                      ? 'btn-ghost !cursor-default opacity-40'
                      : plan.popular
                      ? 'btn-amber'
                      : 'btn-ghost'
                  } disabled:opacity-40`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    'Current plan'
                  ) : (
                    <>Upgrade <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="film-card p-6">
        <span className="section-label mb-4 block">Billing FAQ</span>
        <div className="space-y-5 text-sm font-sans">
          {[
            { q: 'When are credits reset?', a: 'Credits reset on your billing cycle anniversary each month.' },
            { q: 'Can I cancel anytime?', a: 'Yes. Cancel from this page and you keep access until your billing period ends.' },
            { q: 'Do unused credits roll over?', a: 'No â€” credits reset each cycle. Buy one-off credits for occasional extra use.' },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-film-border pb-5 last:border-0 last:pb-0">
              <p className="text-film-cream font-semibold mb-1">{q}</p>
              <p className="text-film-gray">{a}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
