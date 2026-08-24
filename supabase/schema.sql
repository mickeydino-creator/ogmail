-- Postmark City — Supabase schema
-- Run this once in your project's SQL Editor (Database > SQL Editor > New query).

create extension if not exists pgcrypto;

-- One row per account. For real users, id == auth.uid(). Seeded "NPC" rows use a
-- random id and are never logged into — they just populate the map/search so the
-- app isn't empty before real people sign up.
create table if not exists profiles (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  address_id text not null unique,
  is_npc boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists envelopes (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references profiles(id) on delete cascade,
  recipient_id uuid not null references profiles(id) on delete cascade,
  message text not null default '',
  image_data_url text,
  gift text,
  style text not null default 'classic',
  created_at timestamptz not null default now(),
  read boolean not null default false
);

create index if not exists envelopes_recipient_idx on envelopes(recipient_id);
create index if not exists envelopes_sender_idx on envelopes(sender_id);

alter table profiles enable row level security;
alter table envelopes enable row level security;

-- Profiles are a public directory (usernames + addresses only — needed for search
-- and for anyone to see whose house is whose on the shared map).
create policy "profiles are publicly readable" on profiles
  for select using (true);

create policy "a user can create their own profile" on profiles
  for insert with check (auth.uid() = id);

-- Envelopes are private to the two parties involved.
create policy "read your own mail" on envelopes
  for select using (auth.uid() = sender_id or auth.uid() = recipient_id);

create policy "send mail as yourself" on envelopes
  for insert with check (auth.uid() = sender_id);

create policy "recipient can mark their mail read" on envelopes
  for update using (auth.uid() = recipient_id) with check (auth.uid() = recipient_id);

-- Realtime: let clients subscribe to new mail arriving in their inbox.
alter publication supabase_realtime add table envelopes;
