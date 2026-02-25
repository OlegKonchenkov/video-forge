-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Profiles (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  company text,
  avatar_url text,
  credits integer not null default 1,
  plan text not null default 'free' check (plan in ('free','starter','pro','agency')),
  stripe_customer_id text unique,
  created_at timestamptz default now()
);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- Subscriptions
create table subscriptions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles on delete cascade not null,
  stripe_subscription_id text unique not null,
  plan text not null,
  status text not null,
  current_period_end timestamptz not null,
  credits_per_period integer not null,
  created_at timestamptz default now()
);

-- Videos
create table videos (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles on delete cascade not null,
  title text not null default 'Untitled Video',
  status text not null default 'queued' check (status in ('queued','processing','complete','failed')),
  input_type text not null check (input_type in ('url','pdf','ppt','prompt')),
  input_data jsonb not null default '{}',
  output_url text,
  thumbnail_url text,
  duration_s integer,
  progress integer default 0,
  current_step text,
  error_msg text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Credit ledger
create table credit_ledger (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles on delete cascade not null,
  delta integer not null,
  reason text not null check (reason in ('subscription','purchase','usage','bonus','refund')),
  reference_id uuid,
  created_at timestamptz default now()
);

-- RLS policies
alter table profiles enable row level security;
alter table subscriptions enable row level security;
alter table videos enable row level security;
alter table credit_ledger enable row level security;

create policy "Users see own profile" on profiles for all using (auth.uid() = id);
create policy "Users see own subscriptions" on subscriptions for all using (auth.uid() = user_id);
create policy "Users see own videos" on videos for all using (auth.uid() = user_id);
create policy "Users see own ledger" on credit_ledger for select using (auth.uid() = user_id);

-- Realtime for videos
alter publication supabase_realtime add table videos;

-- Helper: deduct credit and log
create or replace function use_credit(p_user_id uuid, p_video_id uuid)
returns void as $$
begin
  update profiles set credits = credits - 1 where id = p_user_id and credits > 0;
  if not found then raise exception 'Insufficient credits'; end if;
  insert into credit_ledger (user_id, delta, reason, reference_id)
  values (p_user_id, -1, 'usage', p_video_id);
end;
$$ language plpgsql security definer;
