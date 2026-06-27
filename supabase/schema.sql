-- Run once in Supabase → SQL Editor.

create table if not exists public.sessions (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- The app reaches Supabase only through the server route using the service-role
-- key, which bypasses RLS. Enabling RLS with no public policies blocks all
-- direct browser/anon access — the secure default for this setup.
alter table public.sessions enable row level security;
