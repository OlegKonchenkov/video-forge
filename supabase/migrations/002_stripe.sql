-- Add stripe_customer_id to subscriptions (for lookup)
alter table subscriptions
  add column if not exists stripe_customer_id text,
  add column if not exists current_period_start timestamptz;

-- add_credits RPC: safely add N credits to a user (used by Stripe webhook)
create or replace function add_credits(p_user_id uuid, p_amount integer)
returns void as $$
begin
  update profiles
    set credits = credits + p_amount
    where id = p_user_id;
  if not found then
    raise exception 'User not found: %', p_user_id;
  end if;
end;
$$ language plpgsql security definer;

-- credit_ledger: track all credit changes for audit trail
alter table credit_ledger
  add column if not exists stripe_payment_intent text;

-- Grant webhook service role access to add_credits
grant execute on function add_credits(uuid, integer) to service_role;
