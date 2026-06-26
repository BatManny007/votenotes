-- VoteNotes schema
-- Run this in your Supabase SQL editor

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  end_time timestamptz,
  closed boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references notes(id) on delete cascade,
  voter_id text not null,
  created_at timestamptz not null default now(),
  unique(note_id, voter_id)
);

-- Indexes
create index if not exists notes_session_id_idx on notes(session_id);
create index if not exists votes_note_id_idx on votes(note_id);

-- Enable Row Level Security
alter table sessions enable row level security;
alter table notes enable row level security;
alter table votes enable row level security;

-- Public read/write policies (anonymous access)
create policy "Public read sessions" on sessions for select using (true);
create policy "Public insert sessions" on sessions for insert with check (true);
create policy "Public update sessions" on sessions for update using (true);

create policy "Public read notes" on notes for select using (true);
create policy "Public insert notes" on notes for insert with check (true);

create policy "Public read votes" on votes for select using (true);
create policy "Public insert votes" on votes for insert with check (true);

-- Enable realtime
alter publication supabase_realtime add table sessions;
alter publication supabase_realtime add table notes;
alter publication supabase_realtime add table votes;
