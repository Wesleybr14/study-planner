// Arquivos do usuário (livros/artigos) que estão no próprio computador.
//
// Duas camadas:
//  - LOCAL: guardado no navegador (IndexedDB). Não sai do PC, funciona offline,
//    mas só existe naquele navegador/aparelho.
//  - NUVEM: enviado para o Supabase Storage, disponível em qualquer aparelho
//    onde o usuário esteja logado (requer a migração 20261001000006_arquivos.sql).

import { supabase } from "@/lib/supabase";

export type TipoArquivo = "livro" | "artigo";
export type OrigemArquivo = "local" | "nuvem";
export type FormatoArquivo = "pdf" | "epub" | "outro";

export type Arquivo = {
  id: string;
  origem: OrigemArquivo;
  tipo: TipoArquivo;
  nome: string;
  mime: string;
  tamanho: number;
  criadoEm: number;
  blob?: Blob; // presente apenas na origem "local"
  storagePath?: string; // presente apenas na origem "nuvem"
};

/** Extensões/MIME aceitos no seletor de arquivos. */
export const TIPOS_ACEITOS = ".pdf,.epub,application/pdf,application/epub+zip";

/** Limite de tamanho por arquivo (o Supabase grátis limita ~50 MB por objeto). */
export const TAMANHO_MAX = 50 * 1024 * 1024;

const BUCKET = "arquivos";

/** Formato do arquivo, a partir do nome e/ou do mime. */
export function formatoDe(nome: string, mime = ""): FormatoArquivo {
  const n = nome.toLowerCase();
  const m = mime.toLowerCase();
  if (m.includes("pdf") || n.endsWith(".pdf")) return "pdf";
  if (m.includes("epub") || n.endsWith(".epub")) return "epub";
  return "outro";
}

/**
 * MIME para enviar ao bucket. O navegador às vezes informa "" para .epub
 * (comum no Windows), e o bucket só aceita PDF/EPUB (migração 8).
 */
export function mimeDe(nome: string, mime = ""): string {
  const formato = formatoDe(nome, mime);
  if (formato === "pdf") return "application/pdf";
  if (formato === "epub") return "application/epub+zip";
  return mime;
}

/** Tamanho legível (ex.: "1,2 MB"). */
export function tamanhoLegivel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "";
  const unidades = ["B", "KB", "MB", "GB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < unidades.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1).replace(".", ",")} ${unidades[i]}`;
}

function novoId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `f${Date.now()}${Math.floor(Math.random() * 1e6)}`;
}

async function usuarioAtual(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

// ---------------------------------------------------------------- local

const BANCO = "study-planner";
const LOJA = "arquivos";
const VERSAO = 1;

type RegistroLocal = {
  id: string;
  escopo: string;
  tipo: TipoArquivo;
  nome: string;
  mime: string;
  tamanho: number;
  criadoEm: number;
  blob: Blob;
};

const escopoDe = (roteiroId: string, indice: number, tipo: TipoArquivo) =>
  `${roteiroId}:${indice}:${tipo}`;

function abrirBanco(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB indisponível neste navegador."));
      return;
    }
    const req = indexedDB.open(BANCO, VERSAO);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(LOJA)) {
        const loja = db.createObjectStore(LOJA, { keyPath: "id" });
        loja.createIndex("escopo", "escopo", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function promessa<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listarLocais(
  roteiroId: string,
  indice: number,
  tipo: TipoArquivo,
): Promise<Arquivo[]> {
  try {
    const db = await abrirBanco();
    const registros = await promessa(
      db
        .transaction(LOJA, "readonly")
        .objectStore(LOJA)
        .index("escopo")
        .getAll(escopoDe(roteiroId, indice, tipo)) as IDBRequest<
        RegistroLocal[]
      >,
    );
    db.close();
    return registros
      .sort((a, b) => b.criadoEm - a.criadoEm)
      .map((r) => ({
        id: r.id,
        origem: "local" as const,
        tipo: r.tipo,
        nome: r.nome,
        mime: r.mime,
        tamanho: r.tamanho,
        criadoEm: r.criadoEm,
        blob: r.blob,
      }));
  } catch {
    return [];
  }
}

export async function salvarLocal(
  roteiroId: string,
  indice: number,
  tipo: TipoArquivo,
  file: File,
): Promise<Arquivo> {
  const db = await abrirBanco();
  const registro: RegistroLocal = {
    id: novoId(),
    escopo: escopoDe(roteiroId, indice, tipo),
    tipo,
    nome: file.name,
    mime: file.type || "",
    tamanho: file.size,
    criadoEm: Date.now(),
    blob: file,
  };
  await promessa(
    db.transaction(LOJA, "readwrite").objectStore(LOJA).put(registro),
  );
  db.close();
  return {
    id: registro.id,
    origem: "local",
    tipo,
    nome: registro.nome,
    mime: registro.mime,
    tamanho: registro.tamanho,
    criadoEm: registro.criadoEm,
    blob: registro.blob,
  };
}

export async function removerLocal(id: string): Promise<void> {
  try {
    const db = await abrirBanco();
    await promessa(
      db.transaction(LOJA, "readwrite").objectStore(LOJA).delete(id),
    );
    db.close();
  } catch {
    // silencioso: nada a fazer se o banco local não estiver disponível
  }
}

export async function renomearLocal(id: string, nome: string): Promise<void> {
  const db = await abrirBanco();
  // Duas transações de propósito: `await` entre requisições desativa a
  // transação do IndexedDB, então lemos e gravamos separadamente.
  const registro = await promessa(
    db.transaction(LOJA, "readonly").objectStore(LOJA).get(id) as IDBRequest<
      RegistroLocal | undefined
    >,
  );
  if (registro) {
    registro.nome = nome;
    await promessa(
      db.transaction(LOJA, "readwrite").objectStore(LOJA).put(registro),
    );
  }
  db.close();
}

// ---------------------------------------------------------------- nuvem

export async function listarNuvem(
  roteiroId: string,
  indice: number,
  tipo: TipoArquivo,
): Promise<Arquivo[]> {
  const uid = await usuarioAtual();
  if (!uid) return [];
  const { data, error } = await supabase
    .from("arquivos")
    .select("id, nome, mime, tamanho, storage_path, criado_em")
    .eq("roteiro_id", roteiroId)
    .eq("topico_index", indice)
    .eq("tipo", tipo)
    .order("criado_em", { ascending: false });
  if (error || !data) return [];
  return data.map((r: any) => ({
    id: r.id,
    origem: "nuvem" as const,
    tipo,
    nome: r.nome,
    mime: r.mime ?? "",
    tamanho: Number(r.tamanho) || 0,
    criadoEm: r.criado_em ? Date.parse(r.criado_em) : Date.now(),
    storagePath: r.storage_path,
  }));
}

/** Sobe um blob local para a nuvem e devolve o registro criado. */
export async function enviarParaNuvem(
  roteiroId: string,
  indice: number,
  tipo: TipoArquivo,
  nome: string,
  mime: string,
  blob: Blob,
): Promise<Arquivo> {
  const uid = await usuarioAtual();
  if (!uid) throw new Error("Faça login para salvar na nuvem.");

  const id = novoId();
  const seguro = nome.replace(/[^\w.\-]+/g, "_").slice(-80) || "arquivo";
  const storagePath = `${uid}/${roteiroId}/${id}-${seguro}`;

  const up = await supabase.storage.from(BUCKET).upload(storagePath, blob, {
    contentType: mimeDe(nome, mime) || undefined,
    upsert: false,
  });
  if (up.error) throw new Error(up.error.message);

  const ins = await supabase
    .from("arquivos")
    .insert({
      user_id: uid,
      roteiro_id: roteiroId,
      topico_index: indice,
      tipo,
      nome,
      mime,
      tamanho: blob.size,
      storage_path: storagePath,
    })
    .select("id")
    .single();

  if (ins.error) {
    // evita objeto órfão no bucket
    await supabase.storage.from(BUCKET).remove([storagePath]);
    throw new Error(ins.error.message);
  }

  return {
    id: ins.data.id,
    origem: "nuvem",
    tipo,
    nome,
    mime,
    tamanho: blob.size,
    criadoEm: Date.now(),
    storagePath,
  };
}

/** Baixa um arquivo da nuvem (via URL assinada) como Blob. */
export async function baixarNuvem(storagePath: string): Promise<Blob> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 60 * 60);
  if (error || !data?.signedUrl)
    throw new Error(error?.message ?? "Não foi possível gerar o link.");

  const resp = await fetch(data.signedUrl);
  if (!resp.ok) throw new Error("Falha ao baixar o arquivo.");
  return await resp.blob();
}

/**
 * Caminhos no bucket dos arquivos ligados a roteiros. Apagar um roteiro remove
 * as linhas de `arquivos` em cascata, mas não os objetos do Storage — use isto
 * antes de apagar e `removerDoBucket` depois, para não deixar órfãos.
 */
export async function caminhosDeRoteiros(): Promise<string[]> {
  const { data, error } = await supabase
    .from("arquivos")
    .select("storage_path")
    .not("roteiro_id", "is", null);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => r.storage_path as string).filter(Boolean);
}

/** Remove objetos do bucket em lotes (melhor esforço: falhas são ignoradas). */
export async function removerDoBucket(caminhos: string[]): Promise<void> {
  for (let i = 0; i < caminhos.length; i += 100)
    await supabase.storage
      .from(BUCKET)
      .remove(caminhos.slice(i, i + 100))
      .catch(() => undefined);
}

export async function removerNuvem(arquivo: Arquivo): Promise<void> {
  if (arquivo.storagePath)
    await supabase.storage.from(BUCKET).remove([arquivo.storagePath]);
  await supabase.from("arquivos").delete().eq("id", arquivo.id);
}

/**
 * Renomeia um arquivo na nuvem. Só o metadado muda — o caminho no bucket
 * (`storage_path`) continua o mesmo, então o arquivo não precisa ser reenviado.
 */
export async function renomearNuvem(
  arquivo: Arquivo,
  nome: string,
): Promise<void> {
  const { error } = await supabase
    .from("arquivos")
    .update({ nome })
    .eq("id", arquivo.id);
  if (error) throw new Error(error.message);
}

/** Dispara o download do arquivo (Blob) para o computador. */
export function salvarNoComputador(blob: Blob, nome: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nome || "arquivo";
  document.body.appendChild(a);
  a.click();
  a.remove();
  // dá tempo do navegador iniciar o download antes de liberar a URL
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

export async function exportarLocais(roteiros: string[]) {
  const db = await abrirBanco();
  const todos = (await promessa(
    db.transaction(LOJA, "readonly").objectStore(LOJA).getAll(),
  )) as RegistroLocal[];
  db.close();
  return todos.filter((r) => roteiros.includes(r.escopo.split(":")[0]));
}
export async function restaurarLocal(registro: {
  escopo: string;
  tipo: TipoArquivo;
  nome: string;
  mime: string;
  blob: Blob;
}) {
  const db = await abrirBanco();
  const id = novoId();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(LOJA, "readwrite");
    tx.objectStore(LOJA).put({
      ...registro,
      id,
      tamanho: registro.blob.size,
      criadoEm: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
  return id;
}
