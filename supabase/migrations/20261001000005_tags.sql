-- ============================================
-- Study Planner - Migração 5 (tags nos roteiros)
-- Cole no Supabase > SQL Editor > New query
-- Necessário APENAS se você já criou a tabela antes.
-- ============================================

alter table public.roteiros
  add column if not exists tags text[] not null default '{}';
