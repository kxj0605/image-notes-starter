-- Run this in the Supabase SQL editor before using subscription management in production.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  provider text,
  notes text,
  category text not null default 'other' check (category in ('network', 'software', 'media', 'cloud', 'membership', 'other')),
  amount numeric(12, 2) not null check (amount > 0),
  billing_cycle text not null check (billing_cycle in ('monthly', 'quarterly', 'semiannual', 'annual', 'custom')),
  start_date date not null,
  end_date date not null,
  renewal_type text not null check (renewal_type in ('manual', 'auto')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint subscriptions_date_order check (end_date > start_date)
);

alter table public.subscriptions add column if not exists provider text;
alter table public.subscriptions add column if not exists notes text;

create index if not exists subscriptions_user_end_date_idx
  on public.subscriptions (user_id, end_date);

alter table public.subscriptions enable row level security;

drop policy if exists "Users can read their subscriptions" on public.subscriptions;
create policy "Users can read their subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their subscriptions" on public.subscriptions;
create policy "Users can create their subscriptions"
  on public.subscriptions for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their subscriptions" on public.subscriptions;
create policy "Users can update their subscriptions"
  on public.subscriptions for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can delete their subscriptions" on public.subscriptions;
create policy "Users can delete their subscriptions"
  on public.subscriptions for delete
  using (auth.uid() = user_id);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  subscription_preferences jsonb not null default '{"viewMode":"cards","cardDensity":"compact","overviewMetrics":["active","monthlyCost","annualCost","dueSoon"]}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "Users can read their preferences" on public.user_preferences;
create policy "Users can read their preferences"
  on public.user_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create their preferences" on public.user_preferences;
create policy "Users can create their preferences"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their preferences" on public.user_preferences;
create policy "Users can update their preferences"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.subscriptions to authenticated;
grant select, insert, update on public.user_preferences to authenticated;
