-- Execute no SQL Editor após as migrações 1–6.
begin;
alter table public.roteiros add column if not exists planejamento jsonb;
alter table public.roteiros add column if not exists versao bigint not null default 0;
create or replace function public.incrementar_versao_roteiro() returns trigger
language plpgsql set search_path = public as $$ begin new.versao := old.versao + 1; return new; end; $$;
drop trigger if exists roteiros_versao on public.roteiros;
create trigger roteiros_versao before update on public.roteiros for each row execute function public.incrementar_versao_roteiro();
create table if not exists public.cotas_api (
 user_id uuid not null references auth.users(id) on delete cascade,
 categoria text not null check (categoria in ('ia', 'busca')),
 janela timestamptz not null, quantidade int not null default 0,
 primary key(user_id, categoria, janela)
);
alter table public.cotas_api enable row level security;
create or replace function public.consumir_cota(categoria text) returns boolean
language plpgsql security definer set search_path = public as $$
declare total int; limite int;
begin
 if auth.uid() is null then raise exception 'Sessão necessária'; end if;
 if categoria not in ('ia', 'busca') then raise exception 'Categoria inválida'; end if;
 delete from public.cotas_api where user_id = auth.uid() and janela < now() - interval '7 days';
 limite := case when categoria = 'ia' then 20 else 200 end;
 insert into public.cotas_api as c(user_id, categoria, janela, quantidade)
 values(auth.uid(), consumir_cota.categoria, date_trunc('hour', now()), 1)
 on conflict on constraint cotas_api_pkey do update set quantidade = c.quantidade + 1
 where c.quantidade < limite returning quantidade into total;
 return total is not null;
end; $$;
revoke all on function public.consumir_cota(text) from public, anon;
grant execute on function public.consumir_cota(text) to authenticated;

-- A chamada RPC inteira é uma transação: uma falha desfaz todas as alterações.
create or replace function public.restaurar_backup(payload jsonb, substituir boolean default false) returns void
language plpgsql security invoker set search_path = public as $$
declare uid uuid := auth.uid(); r jsonb;
begin
 if uid is null then raise exception 'Sessão necessária'; end if;
 if jsonb_typeof(payload->'roteiros') <> 'array' or jsonb_array_length(payload->'roteiros') > 1000 then raise exception 'Backup inválido'; end if;
 if substituir then delete from public.roteiros where user_id = uid; delete from public.sessoes where user_id = uid; end if;
 for r in select value from jsonb_array_elements(payload->'roteiros') loop
  if jsonb_typeof(r->'topicos') <> 'array' then raise exception 'Tópicos inválidos'; end if;
  insert into public.roteiros(id,user_id,tema,descricao,topicos,progresso,prazo,tags,planejamento)
  values((r->>'id')::uuid,uid,r->>'tema',r->>'descricao',r->'topicos',coalesce((r->>'progresso')::int,0),(r->>'prazo')::date,array(select jsonb_array_elements_text(coalesce(r->'tags','[]'::jsonb))),r->'planejamento');
 end loop;
 for r in select value from jsonb_array_elements(coalesce(payload->'sessoes','[]'::jsonb)) loop
  insert into public.sessoes(id,user_id,roteiro_id,topico_index,segundos,criado_em)
  values((r->>'id')::uuid,uid,(r->>'roteiro_id')::uuid,(r->>'topico_index')::int,(r->>'segundos')::int,(r->>'criado_em')::timestamptz);
 end loop;
 for r in select value from jsonb_array_elements(coalesce(payload->'arquivos','[]'::jsonb)) loop
  insert into public.arquivos(id,user_id,roteiro_id,topico_index,tipo,nome,mime,tamanho,storage_path)
  values((r->>'id')::uuid,uid,(r->>'roteiro_id')::uuid,(r->>'topico_index')::int,r->>'tipo',r->>'nome',r->>'mime',(r->>'tamanho')::bigint,r->>'storage_path');
 end loop;
 if payload->'preferencias' is not null and payload->'preferencias' <> 'null'::jsonb then
  insert into public.preferencias(user_id,layout,atualizado_em) values(uid,payload->'preferencias',now())
  on conflict(user_id) do update set layout = excluded.layout, atualizado_em = now();
 end if;
end; $$;
revoke all on function public.restaurar_backup(jsonb,boolean) from public, anon;
grant execute on function public.restaurar_backup(jsonb,boolean) to authenticated;

drop policy if exists "atualizar proprios arquivos" on public.arquivos;
create policy "atualizar proprios arquivos" on public.arquivos for update
 using(auth.uid() = user_id) with check(auth.uid() = user_id and storage_path like auth.uid()::text || '/%');
drop policy if exists "criar proprios arquivos" on public.arquivos;
create policy "criar proprios arquivos" on public.arquivos for insert with check(
 auth.uid() = user_id and storage_path like auth.uid()::text || '/%' and
 (roteiro_id is null or exists(select 1 from public.roteiros where id = roteiro_id and user_id = auth.uid())));
drop policy if exists "criar proprias sessoes" on public.sessoes;
create policy "criar proprias sessoes" on public.sessoes for insert with check(
 auth.uid() = user_id and segundos >= 0 and
 (roteiro_id is null or exists(select 1 from public.roteiros where id = roteiro_id and user_id = auth.uid())));
commit;
