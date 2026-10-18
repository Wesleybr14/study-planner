// Arquivos do usuário (livros/artigos) que estão no próprio computador.
//
// Duas camadas:
//  - LOCAL: guardado no navegador (IndexedDB). Não sai do PC, funciona offline,
//    mas só existe naquele navegador/aparelho.
//  - NUVEM: enviado para o Supabase Storage, disponível em qualquer aparelho
//    onde o usuário esteja logado (requer rodar a supabase-migration-6.sql).

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

  const up = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, blob, {
      contentType: mime || undefined,
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

export async function removerNuvem(arquivo: Arquivo): Promise<void> {
  if (arquivo.storagePath)
    await supabase.storage.from(BUCKET).remove([arquivo.storagePath]);
  await supabase.from("arquivos").delete().eq("id", arquivo.id);
}
