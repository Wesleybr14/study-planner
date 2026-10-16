-- ============================================
-- Study Planner - Migração 2 (deadlines/metas)
-- Cole no Supabase > SQL Editor > New query
-- Necessário APENAS se você já criou a tabela antes.
-- ============================================

alter table public.roteiros
  add column if not exists prazo date;
