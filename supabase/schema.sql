-- ProgressiveOverload Supabase schema
-- Current model:
-- users -> workout_days -> muscle_groups -> exercises -> exercise_sets

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workout_days (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.muscle_groups (
  id uuid primary key default gen_random_uuid(),
  workout_day_id uuid not null references public.workout_days(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (workout_day_id, name)
);

create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  muscle_group_id uuid not null references public.muscle_groups(id) on delete cascade,
  name text not null,
  position integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (muscle_group_id, name)
);

create table if not exists public.exercise_sets (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  set_number integer not null,
  weight numeric(6,2),
  reps integer,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exercise_id, set_number)
);

create index if not exists workout_days_user_id_idx on public.workout_days (user_id);
create index if not exists muscle_groups_workout_day_id_idx on public.muscle_groups (workout_day_id);
create index if not exists exercises_muscle_group_id_idx on public.exercises (muscle_group_id);
create index if not exists exercise_sets_exercise_id_idx on public.exercise_sets (exercise_id);

create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger set_workout_days_updated_at
before update on public.workout_days
for each row execute function public.set_updated_at();

create trigger set_muscle_groups_updated_at
before update on public.muscle_groups
for each row execute function public.set_updated_at();

create trigger set_exercises_updated_at
before update on public.exercises
for each row execute function public.set_updated_at();

create trigger set_exercise_sets_updated_at
before update on public.exercise_sets
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.workout_days enable row level security;
alter table public.muscle_groups enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_sets enable row level security;

create policy "profiles_select_own" on public.profiles
  for select using (id = auth.uid());

create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create policy "workout_days_crud_own" on public.workout_days
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "muscle_groups_crud_own" on public.muscle_groups
  for all using (exists (
    select 1
    from public.workout_days wd
    where wd.id = muscle_groups.workout_day_id
      and wd.user_id = auth.uid()
  )) with check (exists (
    select 1
    from public.workout_days wd
    where wd.id = muscle_groups.workout_day_id
      and wd.user_id = auth.uid()
  ));

create policy "exercises_crud_own" on public.exercises
  for all using (exists (
    select 1
    from public.muscle_groups mg
    join public.workout_days wd on wd.id = mg.workout_day_id
    where mg.id = exercises.muscle_group_id
      and wd.user_id = auth.uid()
  )) with check (exists (
    select 1
    from public.muscle_groups mg
    join public.workout_days wd on wd.id = mg.workout_day_id
    where mg.id = exercises.muscle_group_id
      and wd.user_id = auth.uid()
  ));

create policy "exercise_sets_crud_own" on public.exercise_sets
  for all using (exists (
    select 1
    from public.exercises e
    join public.muscle_groups mg on mg.id = e.muscle_group_id
    join public.workout_days wd on wd.id = mg.workout_day_id
    where e.id = exercise_sets.exercise_id
      and wd.user_id = auth.uid()
  )) with check (exists (
    select 1
    from public.exercises e
    join public.muscle_groups mg on mg.id = e.muscle_group_id
    join public.workout_days wd on wd.id = mg.workout_day_id
    where e.id = exercise_sets.exercise_id
      and wd.user_id = auth.uid()
  ));
