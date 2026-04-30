-- Run in Supabase SQL editor once.

create table if not exists public.profiles (
  user_id text primary key,
  email text not null,
  preferred_language text default 'en',
  updated_at timestamptz default now()
);

create table if not exists public.user_charts (
  user_id text primary key,
  chart_json jsonb not null,
  computed_facts_json jsonb,
  preferred_language text,
  updated_at timestamptz default now()
);

create table if not exists public.readings (
  id bigint generated always as identity primary key,
  user_id text,
  reading_json jsonb,
  computed_facts_meta jsonb,
  created_at timestamptz default now()
);

create index if not exists readings_user_id_idx on public.readings (user_id);
