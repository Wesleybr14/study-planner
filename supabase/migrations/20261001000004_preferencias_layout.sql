-- ============================================
-- Study Planner - Migração 4 (layout em blocos)
-- Cole no Supabase > SQL Editor > New query
-- Necessário para salvar o arranjo do workspace em blocos na nuvem.
-- ============================================

create table if not exists public.preferencias (
  user_id uuid primary key references auth.users(id) on delete cascade,
  layout jsonb,
  atualizado_em timestamptz not null default now()
);

alter table public.preferencias enable row level security;

create policy "ver proprias preferencias"
  on public.preferencias for select
  using (auth.uid() = user_id);

create policy "criar proprias preferencias"
  on public.preferencias for insert
  with check (auth.uid() = user_id);

create policy "atualizar proprias preferencias"
  on public.preferencias for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
