-- 001: set_logs, an append-only history of every logged set.
-- exercise_sets keeps only the current value per set. This table keeps every save,
-- so the client can draw per-exercise progress charts and detect PRs.
-- The client writes one row per set per (local) day: it inserts on the first save
-- and updates that row if the set is corrected later the same day.
-- Apply by hand in the Supabase SQL editor.

create table if not exists public.set_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  set_id uuid references public.exercise_sets(id) on delete set null,
  set_number integer not null,
  weight numeric(6,2),
  reps integer,
  logged_at timestamptz not null default now()
);

alter table public.set_logs enable row level security;

create policy "set_logs_crud_own" on public.set_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index if not exists set_logs_user_exercise_logged_idx
  on public.set_logs (user_id, exercise_id, logged_at desc);
create index if not exists set_logs_set_logged_idx
  on public.set_logs (set_id, logged_at desc);
