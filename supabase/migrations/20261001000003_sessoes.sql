-- ============================================
-- Study Planner - Migração 3 (tempo de estudo)
-- Cole no Supabase > SQL Editor > New query
-- Necessário APENAS se você já criou a tabela antes. Repetível: a tabela
-- inicial já cria estas políticas, então elas são recriadas.
-- ============================================

create table if not exists public.sessoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  roteiro_id uuid references public.roteiros(id) on delete cascade,
  topico_index int,
  segundos int not null default 0,
  criado_em timestamptz not null default now()
);

alter table public.sessoes enable row level security;

drop policy if exists "ver proprias sessoes" on public.sessoes;
create policy "ver proprias sessoes"
  on public.sessoes for select
  using (auth.uid() = user_id);

drop policy if exists "criar proprias sessoes" on public.sessoes;
create policy "criar proprias sessoes"
  on public.sessoes for insert
  with check (auth.uid() = user_id);

drop policy if exists "apagar proprias sessoes" on public.sessoes;
create policy "apagar proprias sessoes"
  on public.sessoes for delete
  using (auth.uid() = user_id);
