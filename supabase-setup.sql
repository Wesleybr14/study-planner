-- ============================================
-- Study Planner - Configuração do banco (Supabase)
-- Cole este código em: Supabase > SQL Editor > New query
-- ============================================

create table if not exists public.roteiros (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tema text not null,
  descricao text,
  topicos jsonb not null default '[]'::jsonb,
  progresso int not null default 0,
  prazo date,
  criado_em timestamptz not null default now()
);

-- Ativar segurança por linha (cada usuário vê só os seus roteiros)
alter table public.roteiros enable row level security;

-- Políticas de acesso
create policy "ver proprios roteiros"
  on public.roteiros for select
  using (auth.uid() = user_id);

create policy "criar proprios roteiros"
  on public.roteiros for insert
  with check (auth.uid() = user_id);

create policy "atualizar proprios roteiros"
  on public.roteiros for update
  using (auth.uid() = user_id);

create policy "apagar proprios roteiros"
  on public.roteiros for delete
  using (auth.uid() = user_id);
