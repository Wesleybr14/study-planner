-- Execute no SQL Editor após as migrações 1–7.
-- 1) Limita o bucket `arquivos` a PDF/EPUB de até 50 MB (o mesmo limite do app).
-- 2) Cota separada para buscas de vídeo: cada busca na YouTube Data API custa
--    100 das 10.000 unidades diárias do projeto inteiro, então ela é bem menor
--    que a das outras buscas.
begin;
update storage.buckets
 set file_size_limit = 52428800,
     allowed_mime_types = array['application/pdf', 'application/epub+zip']
 where id = 'arquivos';

alter table public.cotas_api drop constraint if exists cotas_api_categoria_check;
alter table public.cotas_api add constraint cotas_api_categoria_check
 check (categoria in ('ia', 'busca', 'video'));

create or replace function public.consumir_cota(categoria text) returns boolean
language plpgsql security definer set search_path = public as $$
declare total int; limite int;
begin
 if auth.uid() is null then raise exception 'Sessão necessária'; end if;
 if categoria not in ('ia', 'busca', 'video') then raise exception 'Categoria inválida'; end if;
 delete from public.cotas_api where user_id = auth.uid() and janela < now() - interval '7 days';
 limite := case categoria when 'ia' then 20 when 'video' then 30 else 200 end;
 insert into public.cotas_api as c(user_id, categoria, janela, quantidade)
 values(auth.uid(), consumir_cota.categoria, date_trunc('hour', now()), 1)
 on conflict on constraint cotas_api_pkey do update set quantidade = c.quantidade + 1
 where c.quantidade < limite returning quantidade into total;
 return total is not null;
end; $$;
revoke all on function public.consumir_cota(text) from public, anon;
grant execute on function public.consumir_cota(text) to authenticated;
commit;
