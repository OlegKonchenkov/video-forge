import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

const PLAN_CREDITS: Record<string, number> = {
  starter: 5,
  pro: 20,
  agency: 60,
};

// Map Stripe price IDs → plan names (set in env)
function getPlanFromPriceId(priceId: string): string | null {
  const map: Record<string, string> = {
    [process.env.STRIPE_STARTER_PRICE_ID ?? '']: 'starter',
    [process.env.STRIPE_PRO_PRICE_ID ?? '']: 'pro',
    [process.env.STRIPE_AGENCY_PRICE_ID ?? '']: 'agency',
  };
  return map[priceId] ?? null;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Webhook signature verification failed:', error.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      // ── New subscription created ─────────────────────────
      case 'customer.subscription.created':
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        // One-off credit purchase (payment mode)
        if (event.type === 'checkout.session.completed' && session.mode === 'payment') {
          const userId = session.metadata?.userId;
          if (!userId) break;

          // Add 1 credit
          await supabase.rpc('add_credits', { p_user_id: userId, p_amount: 1 });
          await supabase.from('credit_ledger').insert({
            user_id: userId,
            delta: 1,
            reason: 'one_off_purchase',
            stripe_payment_intent: session.payment_intent,
          });
          break;
        }

        // Subscription checkout
        if (event.type === 'checkout.session.completed' && session.mode === 'subscription') {
          const userId = session.metadata?.userId;
          const sub = await stripe.subscriptions.retrieve(session.subscription as string);
          const priceId = sub.items.data[0]?.price.id;
          const plan = getPlanFromPriceId(priceId);

          if (!userId || !plan) break;

          const credits = PLAN_CREDITS[plan] ?? 0;
          await supabase
            .from('profiles')
            .update({ plan, credits, stripe_customer_id: session.customer as string })
            .eq('id', userId);

          await supabase.from('subscriptions').upsert({
            user_id: userId,
            stripe_subscription_id: sub.id,
            stripe_customer_id: session.customer as string,
            plan,
            status: sub.status,
            current_period_start: new Date((sub as any).current_period_start * 1000).toISOString(),
            current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
          }, { onConflict: 'user_id' });

          await supabase.from('credit_ledger').insert({
            user_id: userId,
            delta: credits,
            reason: 'subscription_start',
          });
        }
        break;
      }

      // ── Monthly renewal — top up credits ─────────────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        if ((invoice as any).billing_reason !== 'subscription_cycle') break;

        const customerId = invoice.customer as string;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, plan')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) break;

        const credits = PLAN_CREDITS[profile.plan] ?? 0;
        await supabase
          .from('profiles')
          .update({ credits })
          .eq('id', profile.id);

        await supabase.from('credit_ledger').insert({
          user_id: profile.id,
          delta: credits,
          reason: 'monthly_renewal',
          stripe_payment_intent: typeof invoice.payment_intent === 'string'
            ? invoice.payment_intent
            : null,
        });
        break;
      }

      // ── Subscription cancelled / downgraded ──────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        const { data: profile } = await supabase
          .from('profiles')
          .select('id')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) break;

        await supabase
          .from('profiles')
          .update({ plan: 'free', credits: 0 })
          .eq('id', profile.id);

        await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      // ── Subscription updated (plan change) ───────────────
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const priceId = sub.items.data[0]?.price.id;
        const plan = getPlanFromPriceId(priceId);
        if (!plan) break;

        const customerId = sub.customer as string;
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, plan')
          .eq('stripe_customer_id', customerId)
          .single();

        if (!profile) break;

        // Only update if plan actually changed
        if (profile.plan !== plan) {
          const credits = PLAN_CREDITS[plan] ?? 0;
          await supabase
            .from('profiles')
            .update({ plan, credits })
            .eq('id', profile.id);

          await supabase.from('credit_ledger').insert({
            user_id: profile.id,
            delta: credits,
            reason: 'plan_change',
          });
        }

        await supabase
          .from('subscriptions')
          .update({
            plan,
            status: sub.status,
            current_period_end: new Date((sub as any).current_period_end * 1000).toISOString(),
          })
          .eq('stripe_subscription_id', sub.id);
        break;
      }

      // ── Payment failed — warn user ────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await supabase
          .from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_customer_id', customerId);
        break;
      }

      default:
        // Unhandled event — log and ignore
        console.log('Unhandled Stripe event:', event.type);
    }
  } catch (err: unknown) {
    const error = err as Error;
    console.error('Webhook handler error:', error);
    return NextResponse.json({ error: 'Handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
