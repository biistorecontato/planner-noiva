-- Planner de Casamento — Universo Noiva da Bi
-- Cole este script no Supabase: SQL Editor > New query > Run.
-- Cria uma tabela com um planner (documento JSON) por conta e garante,
-- via Row Level Security, que cada casal só enxerga o próprio planner.

create table if not exists public.planners (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.planners enable row level security;

drop policy if exists "planner: ler o próprio" on public.planners;
create policy "planner: ler o próprio" on public.planners
  for select using (auth.uid() = user_id);

drop policy if exists "planner: criar o próprio" on public.planners;
create policy "planner: criar o próprio" on public.planners
  for insert with check (auth.uid() = user_id);

drop policy if exists "planner: atualizar o próprio" on public.planners;
create policy "planner: atualizar o próprio" on public.planners
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "planner: apagar o próprio" on public.planners;
create policy "planner: apagar o próprio" on public.planners
  for delete using (auth.uid() = user_id);
