-- ==============================================================================
-- SATURN SECOND BRAIN — Supabase Database Schema & Row Level Security (RLS)
-- ==============================================================================
-- Run this script in the Supabase Dashboard -> SQL Editor to provision
-- the private, user-isolated notes table with strict ownership policies.
-- ==============================================================================

-- 1. Create the Notes Table
create table if not exists public.notes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null default '',
  content text not null default '',
  tags text[] default array[]::text[],
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
-- Mandatory: No table access is permitted unless governed by an explicit policy.
alter table public.notes enable row level security;

-- 3. RLS Policy: SELECT (Read only own notes)
drop policy if exists "Users can view own notes" on public.notes;
create policy "Users can view own notes"
  on public.notes for select
  using (auth.uid() = user_id);

-- 4. RLS Policy: INSERT (Insert notes strictly with own auth.uid)
drop policy if exists "Users can insert own notes" on public.notes;
create policy "Users can insert own notes"
  on public.notes for insert
  with check (auth.uid() = user_id);

-- 5. RLS Policy: UPDATE (Update only own notes)
drop policy if exists "Users can update own notes" on public.notes;
create policy "Users can update own notes"
  on public.notes for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 6. RLS Policy: DELETE (Delete only own notes)
drop policy if exists "Users can delete own notes" on public.notes;
create policy "Users can delete own notes"
  on public.notes for delete
  using (auth.uid() = user_id);

-- 7. Optimized index for user-specific queries
create index if not exists notes_user_id_created_at_idx 
  on public.notes (user_id, created_at desc);

-- 8. Automatic updated_at timestamp trigger
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_notes_updated_at on public.notes;
create trigger set_notes_updated_at
  before update on public.notes
  for each row
  execute function public.handle_updated_at();

-- 9. Create Access Requests Table for Rate-Limiting & Audit Logging
create table if not exists public.access_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  requester_email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.access_requests enable row level security;

drop policy if exists "Users can view own access requests" on public.access_requests;
create policy "Users can view own access requests"
  on public.access_requests for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert own access requests" on public.access_requests;
create policy "Users can insert own access requests"
  on public.access_requests for insert
  with check (auth.uid() = user_id);

create index if not exists access_requests_user_id_created_at_idx 
  on public.access_requests (user_id, created_at desc);

