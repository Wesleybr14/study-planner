// Modelo do "workspace em blocos": uma grade de 12 colunas onde cada bloco
// (vídeo, livro, artigos, notas, flashcards, quiz) pode ser movido e
// redimensionado pelo usuário.
//
// Arranjos: além do layout padrão, o usuário pode salvar arranjos nomeados
// (biblioteca) e escolher qual usar em cada tópico ("situação"). Tudo fica na
// nuvem, na coluna `preferencias.layout` (jsonb).

import { supabase } from "@/lib/supabase";

export type TipoBloco =
  "video" | "livro" | "artigos" | "arquivos" | "notas" | "flashcards" | "quiz";

export type Bloco = {
  id: TipoBloco;
  x: number; // coluna inicial (0-based)
  y: number; // linha inicial (0-based)
  w: number; // largura em colunas
  h: number; // altura em linhas
  oculto?: boolean; // bloco escondido (não ocupa espaço na grade)
};

export type Layout = Bloco[];

export type ArranjoSalvo = { id: string; nome: string; blocos: Layout };

export type Arranjos = {
  padrao: Layout; // usado em tópicos sem arranjo próprio
  trabalho: Record<string, Layout>; // arranjo por tópico (chave = roteiroId:indice)
  escolha: Record<string, string>; // arranjo escolhido por tópico ("custom" = editado à mão)
  escolhaGlobal?: string; // arranjo aplicado a TODOS os tópicos (botão "Aplicar a todos")
  salvos: ArranjoSalvo[]; // biblioteca de arranjos nomeados
};

export const COLUNAS = 12;
export const ALTURA_LINHA = 44; // px por linha da grade
export const ESPACO = 12; // espaçamento entre blocos (px)

export const TIPOS: Record<TipoBloco, { rotulo: string; icone: string }> = {
  video: { rotulo: "Vídeo", icone: "🎬" },
  livro: { rotulo: "Livro", icone: "📖" },
  artigos: { rotulo: "Artigos", icone: "🔬" },
  arquivos: { rotulo: "Meus arquivos", icone: "📁" },
  notas: { rotulo: "Notas", icone: "📝" },
  flashcards: { rotulo: "Flashcards", icone: "🃏" },
  quiz: { rotulo: "Quiz", icone: "❓" },
};

export const TIPOS_ORDEM: TipoBloco[] = [
  "video",
  "livro",
  "artigos",
  "arquivos",
  "notas",
  "flashcards",
  "quiz",
];

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

const num = (v: unknown, def: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.round(v) : def;

// Layout inicial: vídeo com livro na primeira faixa, quiz/notas/artigos na
// segunda e flashcards/meus arquivos na última — uma grade cheia, sem buracos.
export const LAYOUT_PADRAO: Layout = [
  { id: "video", x: 0, y: 0, w: 8, h: 9 },
  { id: "livro", x: 8, y: 0, w: 4, h: 9 },
  { id: "quiz", x: 0, y: 9, w: 4, h: 5 },
  { id: "notas", x: 4, y: 9, w: 4, h: 5 },
  { id: "artigos", x: 8, y: 9, w: 4, h: 5 },
  { id: "flashcards", x: 0, y: 14, w: 6, h: 4 },
  { id: "arquivos", x: 6, y: 14, w: 6, h: 4 },
];

// Arranjos prontos (não entram na biblioteca do usuário).
export const PRESETS: { nome: string; layout: Layout }[] = [
  {
    nome: "Vídeo + lateral",
    layout: LAYOUT_PADRAO.map((b) => ({ ...b })),
  },
  {
    nome: "Grade 2×2",
    layout: [
      { id: "video", x: 0, y: 0, w: 6, h: 6 },
      { id: "livro", x: 6, y: 0, w: 6, h: 6 },
      { id: "artigos", x: 0, y: 6, w: 6, h: 6 },
      { id: "notas", x: 6, y: 6, w: 6, h: 6 },
      { id: "flashcards", x: 0, y: 12, w: 6, h: 5 },
      { id: "quiz", x: 6, y: 12, w: 6, h: 5 },
      { id: "arquivos", x: 0, y: 17, w: 12, h: 4 },
    ],
  },
  {
    nome: "Foco no vídeo",
    layout: [
      { id: "video", x: 0, y: 0, w: 12, h: 8 },
      { id: "livro", x: 0, y: 8, w: 6, h: 7 },
      { id: "notas", x: 6, y: 8, w: 6, h: 7 },
      { id: "artigos", x: 0, y: 15, w: 6, h: 6 },
      { id: "quiz", x: 6, y: 15, w: 6, h: 6 },
      { id: "flashcards", x: 0, y: 21, w: 12, h: 4 },
      { id: "arquivos", x: 0, y: 25, w: 12, h: 4 },
    ],
  },
  {
    nome: "Leitura (livro grande)",
    layout: [
      { id: "livro", x: 0, y: 0, w: 7, h: 14 },
      { id: "video", x: 7, y: 0, w: 5, h: 7 },
      { id: "artigos", x: 7, y: 7, w: 5, h: 7 },
      { id: "notas", x: 0, y: 14, w: 7, h: 6 },
      { id: "quiz", x: 7, y: 14, w: 5, h: 6 },
      { id: "flashcards", x: 0, y: 20, w: 12, h: 4 },
      { id: "arquivos", x: 0, y: 24, w: 12, h: 4 },
    ],
  },
  {
    nome: "Coluna única",
    layout: [
      { id: "video", x: 0, y: 0, w: 12, h: 6 },
      { id: "livro", x: 0, y: 6, w: 12, h: 6 },
      { id: "artigos", x: 0, y: 12, w: 12, h: 6 },
      { id: "notas", x: 0, y: 18, w: 12, h: 6 },
      { id: "flashcards", x: 0, y: 24, w: 12, h: 4 },
      { id: "quiz", x: 0, y: 28, w: 12, h: 5 },
      { id: "arquivos", x: 0, y: 33, w: 12, h: 4 },
    ],
  },
];

/** Dois blocos se sobrepõem? */
export function colide(a: Bloco, b: Bloco): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

/** O bloco `alvo` cabe sem colidir com os demais blocos visíveis? */
export function cabe(layout: Layout, alvo: Bloco): boolean {
  return !layout.some((b) => b.id !== alvo.id && !b.oculto && colide(b, alvo));
}

/** Garante que o layout tenha todos os tipos, valores válidos e sem colisões. */
export function normalizarLayout(entrada: unknown): Layout {
  if (!Array.isArray(entrada)) return LAYOUT_PADRAO.map((b) => ({ ...b }));

  const porId = new Map<TipoBloco, Bloco>();
  for (const item of entrada as any[]) {
    if (!item || !TIPOS[item.id as TipoBloco]) continue;
    const x = clamp(num(item.x, 0), 0, COLUNAS - 1);
    const w = clamp(num(item.w, 6), 1, COLUNAS - x);
    porId.set(item.id, {
      id: item.id,
      x,
      y: Math.max(0, num(item.y, 0)),
      w,
      h: Math.max(2, num(item.h, 5)),
      ...(item.oculto ? { oculto: true } : {}),
    });
  }

  const lista = [...porId.values()];

  // Completa com o padrão o que estiver faltando (ex.: um tipo de bloco novo).
  // Entra empilhado no fim, em largura total, para NÃO colidir nem resetar o
  // arranjo que o usuário já tinha salvo.
  let fim = lista.reduce((a, b) => Math.max(a, b.y + b.h), 0);
  for (const def of LAYOUT_PADRAO)
    if (!porId.has(def.id)) {
      const novo = { ...def, x: 0, y: fim, w: COLUNAS };
      porId.set(def.id, novo);
      lista.push(novo);
      fim += def.h;
    }

  // Valida colisões apenas entre os blocos visíveis.
  const visiveis = lista.filter((b) => !b.oculto);
  for (let i = 0; i < visiveis.length; i++)
    for (let j = i + 1; j < visiveis.length; j++)
      if (colide(visiveis[i], visiveis[j]))
        return LAYOUT_PADRAO.map((b) => ({ ...b }));

  return lista;
}

// ---------- Arranjos ----------

/** Chave de um tópico dentro de um roteiro. */
export function topicKey(roteiroId: string, indice: number): string {
  return `${roteiroId}:${indice}`;
}

/** Id de um arranjo pronto (preset). */
export function presetId(nome: string): string {
  return `preset:${nome}`;
}

/** Gera um id único para um arranjo salvo. */
export function novoIdArranjo(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto)
    return crypto.randomUUID();
  return `a${Date.now()}${Math.floor(Math.random() * 1e6)}`;
}

/** Blocos de um arranjo (preset ou salvo). */
export function blocosDoArranjo(
  arranjos: Arranjos | null,
  id: string,
): Layout | null {
  if (id.startsWith("preset:")) {
    const nome = id.slice("preset:".length);
    const p = PRESETS.find((p) => p.nome === nome);
    return p ? p.layout.map((b) => ({ ...b })) : null;
  }
  const s = arranjos?.salvos.find((s) => s.id === id);
  return s ? s.blocos.map((b) => ({ ...b })) : null;
}

const layoutDe = (v: unknown): Layout | null =>
  v == null ? null : normalizarLayout(v);

export function normalizarArranjos(entrada: unknown): Arranjos {
  const base: Arranjos = {
    padrao: LAYOUT_PADRAO.map((b) => ({ ...b })),
    trabalho: {},
    escolha: {},
    salvos: [],
  };

  // Formato antigo: a coluna guardava apenas um array (layout único).
  if (Array.isArray(entrada))
    return { ...base, padrao: normalizarLayout(entrada) };

  if (!entrada || typeof entrada !== "object") return base;
  const e = entrada as any;

  const salvos: ArranjoSalvo[] = Array.isArray(e.salvos)
    ? e.salvos
        .filter(
          (s: any) =>
            s && typeof s.id === "string" && typeof s.nome === "string",
        )
        .map((s: any) => ({
          id: s.id,
          nome: s.nome,
          blocos: normalizarLayout(s.blocos),
        }))
    : [];

  const trabalho: Record<string, Layout> = {};
  if (e.trabalho && typeof e.trabalho === "object")
    for (const [k, v] of Object.entries(e.trabalho)) {
      const l = layoutDe(v);
      if (l) trabalho[k] = l;
    }

  const escolha: Record<string, string> = {};
  if (e.escolha && typeof e.escolha === "object")
    for (const [k, v] of Object.entries(e.escolha))
      if (typeof v === "string") escolha[k] = v;

  return {
    padrao: layoutDe(e.padrao) ?? base.padrao,
    trabalho,
    escolha,
    escolhaGlobal:
      typeof e.escolhaGlobal === "string" ? e.escolhaGlobal : undefined,
    salvos,
  };
}

// ---------- Persistência (nuvem, por usuário) ----------

type RascunhoArranjos = { arranjos: Arranjos; pendente: boolean };
export function lerArranjosLocal(uid: string): RascunhoArranjos | null {
  try {
    const dado = JSON.parse(localStorage.getItem(`arranjos:${uid}`) ?? "null");
    return dado?.arranjos
      ? {
          arranjos: normalizarArranjos(dado.arranjos),
          pendente: !!dado.pendente,
        }
      : null;
  } catch {
    return null;
  }
}
export function guardarArranjosLocal(
  uid: string,
  arranjos: Arranjos,
  pendente = true,
) {
  localStorage.setItem(
    `arranjos:${uid}`,
    JSON.stringify({ arranjos, pendente }),
  );
}
export async function carregarArranjos(): Promise<Arranjos | null> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user.id;
  if (!uid) return null;
  const local = lerArranjosLocal(uid);
  if (local?.pendente) return local.arranjos;
  try {
    const { data, error } = await supabase
      .from("preferencias")
      .select("layout")
      .eq("user_id", uid)
      .maybeSingle();
    if (error) return local?.arranjos ?? null;
    return data?.layout
      ? normalizarArranjos(data.layout)
      : (local?.arranjos ?? null);
  } catch {
    return local?.arranjos ?? null;
  }
}
export async function salvarArranjos(arranjos: Arranjos): Promise<void> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user.id;
  if (!uid)
    throw new Error(
      "Sessão expirada. Entre novamente para sincronizar o layout.",
    );
  const { error } = await supabase
    .from("preferencias")
    .upsert({
      user_id: uid,
      layout: arranjos,
      atualizado_em: new Date().toISOString(),
    });
  if (error) throw new Error(error.message);
  const local = lerArranjosLocal(uid);
  if (!local || JSON.stringify(local.arranjos) === JSON.stringify(arranjos)) {
    try {
      guardarArranjosLocal(uid, arranjos, false);
    } catch {}
  }
}
