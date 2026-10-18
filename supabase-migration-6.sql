-- ============================================
-- Study Planner - Migração 6: arquivos do usuário (livros/artigos)
-- Cole este código em: Supabase > SQL Editor > New query
--
-- Cria o bucket privado `arquivos` (Supabase Storage) para guardar PDFs/EPUBs
-- que o usuário envia da própria máquina, além da tabela de metadados.
-- Cada usuário só enxerga/grava dentro da sua própria pasta ({user_id}/...).
-- ============================================

-- ---------- Bucket (privado) ----------
insert into storage.buckets (id, name, public)
values ('arquivos', 'arquivos', false)
on conflict (id) do nothing;

-- Políticas do Storage: só a própria pasta ({user_id}/...)
drop policy if exists "arquivos: ver proprios" on storage.objects;
create policy "arquivos: ver proprios"
  on storage.objects for select
  using (
    bucket_id = 'arquivos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "arquivos: enviar proprios" on storage.objects;
create policy "arquivos: enviar proprios"
  on storage.objects for insert
  with check (
    bucket_id = 'arquivos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "arquivos: atualizar proprios" on storage.objects;
create policy "arquivos: atualizar proprios"
  on storage.objects for update
  using (
    bucket_id = 'arquivos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "arquivos: apagar proprios" on storage.objects;
create policy "arquivos: apagar proprios"
  on storage.objects for delete
  using (
    bucket_id = 'arquivos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- Metadados ----------
create table if not exists public.arquivos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  roteiro_id uuid references public.roteiros(id) on delete cascade,
  topico_index int,
  tipo text not null default 'livro', -- 'livro' | 'artigo'
  nome text not null,
  mime text,
  tamanho bigint,
  storage_path text not null,
  criado_em timestamptz not null default now()
);

create index if not exists arquivos_escopo_idx
  on public.arquivos (roteiro_id, topico_index, tipo);

alter table public.arquivos enable row level security;

drop policy if exists "ver proprios arquivos" on public.arquivos;
create policy "ver proprios arquivos"
  on public.arquivos for select
  using (auth.uid() = user_id);

drop policy if exists "criar proprios arquivos" on public.arquivos;
create policy "criar proprios arquivos"
  on public.arquivos for insert
  with check (auth.uid() = user_id);

drop policy if exists "apagar proprios arquivos" on public.arquivos;
create policy "apagar proprios arquivos"
  on public.arquivos for delete
  using (auth.uid() = user_id);
