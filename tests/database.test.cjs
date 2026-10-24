const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PGlite } = require("@electric-sql/pglite");
const uid = "11111111-1111-4111-8111-111111111111",
  outro = "22222222-2222-4222-8222-222222222222";
test("migração: cotas (ia, busca e vídeo), bucket, isolamento de usuário e rollback real da restauração", async () => {
  const db = new PGlite();
  try {
    await db.exec(`create schema auth; create schema storage; create role anon; create role authenticated;
 create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.uid', true), '')::uuid $$;
 create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid, bucket_id text, name text);
 create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
 insert into auth.users values('${uid}'),('${outro}');`);
    // Todas as migrações em ordem, como o `supabase db push` faz num banco novo.
    const pasta = path.resolve(__dirname, "..", "supabase", "migrations");
    const migracoes = fs.readdirSync(pasta).filter((f) => f.endsWith(".sql"));
    assert.ok(migracoes.length >= 8);
    for (const file of migracoes.sort())
      await db.exec(fs.readFileSync(path.join(pasta, file), "utf8"));
    assert.deepEqual(
      (
        await db.query(
          "select file_size_limit::int as limite, allowed_mime_types as tipos from storage.buckets where id='arquivos'",
        )
      ).rows[0],
      { limite: 52428800, tipos: ["application/pdf", "application/epub+zip"] },
    );
    await db.exec(
      `grant usage on schema public,auth,storage to authenticated; grant all on all tables in schema public to authenticated; grant execute on all functions in schema auth to authenticated; set role authenticated; set app.uid='${uid}';`,
    );
    const quotas = await db.query(
      "select public.consumir_cota('ia') as permitido from generate_series(1,25)",
    );
    assert.equal(quotas.rows.filter((r) => r.permitido).length, 20);
    assert.equal(
      (await db.query("select public.consumir_cota('busca') as permitido"))
        .rows[0].permitido,
      true,
    );
    const videos = await db.query(
      "select public.consumir_cota('video') as permitido from generate_series(1,35)",
    );
    assert.equal(videos.rows.filter((r) => r.permitido).length, 30);
    await assert.rejects(db.query("select public.consumir_cota('outra')"));
    const old = "33333333-3333-4333-8333-333333333333";
    await db.query(
      "insert into roteiros(id,user_id,tema,topicos) values($1,$2,'Antigo','[]')",
      [old, uid],
    );
    const novo = "44444444-4444-4444-8444-444444444444";
    const payload = {
      roteiros: [
        {
          id: novo,
          tema: "Novo",
          topicos: [{ id: "t", titulo: "A", recursoIndex: 0 }],
          progresso: 0,
          tags: [],
        },
      ],
      sessoes: [
        { id: "INVALIDO", segundos: 20, criado_em: new Date().toISOString() },
      ],
    };
    await assert.rejects(
      db.query("select restaurar_backup($1::jsonb,true)", [
        JSON.stringify(payload),
      ]),
    );
    assert.equal(
      (await db.query("select tema from roteiros")).rows[0].tema,
      "Antigo",
    );
    const antes = (
      await db.query("select versao from roteiros where id=$1", [old])
    ).rows[0].versao;
    await db.query(
      "update roteiros set tema='Atualizado' where id=$1 and versao=$2",
      [old, antes],
    );
    const conflito = await db.query(
      "update roteiros set tema='Sobrescrito' where id=$1 and versao=$2 returning id",
      [old, antes],
    );
    assert.equal(conflito.rows.length, 0);
    payload.sessoes = [];
    await db.query("select restaurar_backup($1::jsonb,true)", [
      JSON.stringify(payload),
    ]);
    assert.deepEqual((await db.query("select id,tema from roteiros")).rows, [
      { id: novo, tema: "Novo" },
    ]);
    await assert.rejects(
      db.query(
        "insert into arquivos(user_id,roteiro_id,tipo,nome,storage_path) values($1,$2,'livro','x.pdf',$3)",
        [uid, novo, `${outro}/x.pdf`],
      ),
    );
    await db.exec(`set app.uid='${outro}';`);
    assert.equal((await db.query("select * from roteiros")).rows.length, 0);
    assert.equal(
      (await db.query("select consumir_cota('ia') as permitido")).rows[0]
        .permitido,
      true,
    );
  } finally {
    await db.close();
  }
});
