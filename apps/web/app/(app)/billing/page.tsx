'use client';

import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { motion } from 'framer-motion';
import { Zap, CreditCard, CheckCircle, Crown, Rocket, Building2, ArrowRight, Loader2 } from 'lucide-react';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    credits: 5,
    icon: Zap,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    priceId: process.env.NEXT_PUBLIC_STRIPE_STARTER_PRICE_ID ?? '',
    features: ['5 AI videos / month', 'All input types', '1080p HD', 'Email support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    credits: 20,
    icon: Rocket,
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID ?? '',
    popular: true,
    features: ['20 AI videos / month', 'Priority rendering', '4K output', 'Custom branding', 'Priority support'],
  },
  {
    id: 'agency',
    name: 'Agency',
    price: 199,
    credits: 60,
    icon: Building2,
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/20',
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
    if (!priceId) {
      alert('Stripe price ID not configured. Set NEXT_PUBLIC_STRIPE_*_PRICE_ID in your .env.local');
      return;
    }
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
      const error = err as Error;
      alert('Checkout failed: ' + error.message);
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
      const error = err as Error;
      alert('Checkout failed: ' + error.message);
      setCheckoutLoading(null);
    }
  }

  const currentPlan = PLANS.find(p => p.id === profile?.plan) ?? null;
  const creditsPercent = currentPlan ? Math.round(((profile?.credits ?? 0) / currentPlan.credits) * 100) : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-10 space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Billing</h1>
        <p className="text-gray-400 mt-1">Manage your plan and credits</p>
      </div>

      {/* Current Plan Card */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-6 border border-white/10"
      >
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-sm text-gray-400 mb-1">Current plan</p>
            {loading ? (
              <div className="h-8 w-32 bg-white/10 rounded animate-pulse" />
            ) : (
              <div className="flex items-center gap-3">
                <Crown className="w-5 h-5 text-yellow-400" />
                <span className="text-2xl font-bold text-white capitalize">
                  {profile?.plan ?? 'Free'}
                </span>
              </div>
            )}
          </div>

          <div className="text-right">
            <p className="text-sm text-gray-400 mb-1">Credits remaining</p>
            {loading ? (
              <div className="h-8 w-20 bg-white/10 rounded animate-pulse" />
            ) : (
              <span className="text-2xl font-bold text-white">{profile?.credits ?? 0}</span>
            )}
          </div>
        </div>

        {/* Credits bar */}
        {!loading && currentPlan && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{profile?.credits} remaining</span>
              <span>{currentPlan.credits} / month</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all"
                style={{ width: `${creditsPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* One-off credits */}
        <div className="mt-6 flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
          <div>
            <p className="text-white font-medium">Need more videos now?</p>
            <p className="text-sm text-gray-400">Buy 1 video credit for $9 — no subscription needed</p>
          </div>
          <button
            onClick={handleBuyCredits}
            disabled={checkoutLoading === 'credits'}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
          >
            {checkoutLoading === 'credits' ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CreditCard className="w-4 h-4" />
            )}
            Buy Credit
          </button>
        </div>
      </motion.div>

      {/* Plans grid */}
      <div>
        <h2 className="text-xl font-semibold text-white mb-6">Upgrade your plan</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => {
            const Icon = plan.icon;
            const isCurrent = profile?.plan === plan.id;
            const isLoading = checkoutLoading === plan.id;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className={`relative rounded-2xl p-6 border transition-all ${
                  plan.popular
                    ? 'gradient-border glow-blue scale-[1.02]'
                    : `bg-bg-card ${plan.border} border`
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full shadow-lg">
                      Most Popular
                    </span>
                  </div>
                )}

                {isCurrent && (
                  <div className="absolute -top-3 right-4">
                    <span className="px-3 py-1 text-xs font-semibold bg-green-500/20 text-green-400 border border-green-500/30 rounded-full">
                      Current
                    </span>
                  </div>
                )}

                <div className={`inline-flex p-2 rounded-xl ${plan.bg} mb-4`}>
                  <Icon className={`w-5 h-5 ${plan.color}`} />
                </div>

                <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2 mb-4">
                  <span className="text-3xl font-bold text-white">${plan.price}</span>
                  <span className="text-gray-400 text-sm">/month</span>
                </div>

                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => !isCurrent && handleCheckout(plan.priceId, plan.id)}
                  disabled={isCurrent || isLoading}
                  className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition-all ${
                    isCurrent
                      ? 'bg-white/5 text-gray-500 cursor-default'
                      : plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:opacity-90 shadow-lg shadow-blue-500/20'
                      : 'bg-white/10 text-white hover:bg-white/20'
                  } disabled:opacity-60`}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : isCurrent ? (
                    'Current plan'
                  ) : (
                    <>
                      Upgrade <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* FAQ */}
      <div className="glass rounded-2xl p-6 border border-white/10">
        <h3 className="text-lg font-semibold text-white mb-4">Billing FAQ</h3>
        <div className="space-y-4 text-sm text-gray-400">
          <div>
            <p className="text-white font-medium">When are credits reset?</p>
            <p>Credits reset on your billing cycle anniversary each month.</p>
          </div>
          <div>
            <p className="text-white font-medium">Can I cancel anytime?</p>
            <p>Yes. Cancel from this page and you keep access until your billing period ends.</p>
          </div>
          <div>
            <p className="text-white font-medium">Do unused credits roll over?</p>
            <p>No — credits are reset each billing cycle. Buy one-off credits for occasional extra use.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
