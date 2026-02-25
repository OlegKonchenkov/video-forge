import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

export async function POST(req: NextRequest) {
  const { priceId, userId, mode = 'subscription', quantity = 1 } = await req.json();

  if (!priceId || !userId) {
    return NextResponse.json({ error: 'Missing priceId or userId' }, { status: 400 });
  }

  // Look up or create Stripe customer
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id, email:id')
    .eq('id', userId)
    .single();

  let customerId = profile?.stripe_customer_id ?? undefined;

  if (!customerId) {
    const { data: authUser } = await supabase.auth.admin.getUserById(userId);
    const customer = await stripe.customers.create({
      email: authUser.user?.email,
      metadata: { supabase_user_id: userId },
    });
    customerId = customer.id;
    await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userId);
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: mode as Stripe.Checkout.SessionCreateParams.Mode,
    line_items: [{ price: priceId, quantity }],
    success_url: `${appUrl}/billing?success=1`,
    cancel_url: `${appUrl}/billing`,
    metadata: { userId },
    subscription_data: mode === 'subscription' ? { metadata: { userId } } : undefined,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
