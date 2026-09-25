-- Attendance for the graduation invitation.
-- Run once in Supabase → SQL Editor.
-- The public (anon) key can only INSERT a name; nobody can read the list with it.

create table if not exists public.attendance (
  id           bigint generated always as identity primary key,
  name         text        not null check (char_length(btrim(name)) between 1 and 80),
  submitted_at timestamptz not null default now()
);

alter table public.attendance enable row level security;

-- Column-level grant: guests send only `name`; `submitted_at` is set by the server.
revoke all on public.attendance from anon, authenticated;
grant insert (name) on public.attendance to anon;

drop policy if exists "guests can add their name" on public.attendance;
create policy "guests can add their name"
  on public.attendance
  for insert
  to anon
  with check (true);

-- No SELECT policy → the list is private.
-- Read it in Table Editor, or:
--   select name, submitted_at from public.attendance order by submitted_at;
