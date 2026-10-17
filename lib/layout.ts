// Modelo do "workspace em blocos": uma grade de 12 colunas onde cada bloco
// (vídeo, livro, artigos, notas, flashcards, quiz) pode ser movido e
// redimensionado pelo usuário. O arranjo é único por usuário e fica na nuvem.

import { supabase } from "@/lib/supabase";

export type TipoBloco =
  "video" | "livro" | "artigos" | "notas" | "flashcards" | "quiz";

export type Bloco = {
  id: TipoBloco;
  x: number; // coluna inicial (0-based)
  y: number; // linha inicial (0-based)
  w: number; // largura em colunas
  h: number; // altura em linhas
};

export type Layout = Bloco[];

export const COLUNAS = 12;
export const ALTURA_LINHA = 44; // px por linha da grade
export const ESPACO = 12; // espaçamento entre blocos (px)

export const TIPOS: Record<TipoBloco, { rotulo: string; icone: string }> = {
  video: { rotulo: "Vídeo", icone: "🎬" },
  livro: { rotulo: "Livro", icone: "📖" },
  artigos: { rotulo: "Artigos", icone: "🔬" },
  notas: { rotulo: "Notas", icone: "📝" },
  flashcards: { rotulo: "Flashcards", icone: "🃏" },
  quiz: { rotulo: "Quiz", icone: "❓" },
};

export const TIPOS_ORDEM: TipoBloco[] = [
  "video",
  "livro",
  "artigos",
  "notas",
  "flashcards",
  "quiz",
];

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

// Layout inicial: vídeo em cima à esquerda, livro em modo retrato à direita,
// quiz abaixo à esquerda — como no exemplo.
export const LAYOUT_PADRAO: Layout = [
  { id: "video", x: 0, y: 0, w: 7, h: 7 },
  { id: "livro", x: 7, y: 0, w: 5, h: 12 },
  { id: "quiz", x: 0, y: 7, w: 7, h: 5 },
  { id: "notas", x: 0, y: 12, w: 7, h: 6 },
  { id: "artigos", x: 7, y: 12, w: 5, h: 6 },
  { id: "flashcards", x: 0, y: 18, w: 12, h: 4 },
];

export const PRESETS: { nome: string; layout: Layout }[] = [
  {
    nome: "Vídeo + lateral",
    layout: [
      { id: "video", x: 0, y: 0, w: 7, h: 7 },
      { id: "livro", x: 7, y: 0, w: 5, h: 12 },
      { id: "quiz", x: 0, y: 7, w: 7, h: 5 },
      { id: "notas", x: 0, y: 12, w: 7, h: 6 },
      { id: "artigos", x: 7, y: 12, w: 5, h: 6 },
      { id: "flashcards", x: 0, y: 18, w: 12, h: 4 },
    ],
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
    ],
  },
];

/** Dois blocos se sobrepõem? */
export function colide(a: Bloco, b: Bloco): boolean {
  return (
    a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
  );
}

/** O bloco `alvo` cabe sem colidir com os demais? */
export function cabe(layout: Layout, alvo: Bloco): boolean {
  return !layout.some((b) => b.id !== alvo.id && colide(b, alvo));
}

/** Garante que o layout tenha todos os tipos, valores válidos e sem colisões. */
export function normalizarLayout(entrada: unknown): Layout {
  if (!Array.isArray(entrada)) return LAYOUT_PADRAO.map((b) => ({ ...b }));

  const porId = new Map<TipoBloco, Bloco>();
  for (const item of entrada as any[]) {
    if (!item || !TIPOS[item.id as TipoBloco]) continue;
    const x = Number.isFinite(item.x)
      ? clamp(Math.round(item.x), 0, COLUNAS - 1)
      : 0;
    const w = Number.isFinite(item.w)
      ? clamp(Math.round(item.w), 1, COLUNAS - x)
      : 6;
    porId.set(item.id, {
      id: item.id,
      x,
      y: Number.isFinite(item.y) ? Math.max(0, Math.round(item.y)) : 0,
      w,
      h: Number.isFinite(item.h) ? Math.max(2, Math.round(item.h)) : 5,
    });
  }

  // Completa com o padrão o que estiver faltando.
  for (const def of LAYOUT_PADRAO)
    if (!porId.has(def.id)) porId.set(def.id, { ...def });

  const lista = [...porId.values()];
  for (let i = 0; i < lista.length; i++)
    for (let j = i + 1; j < lista.length; j++)
      if (colide(lista[i], lista[j]))
        return LAYOUT_PADRAO.map((b) => ({ ...b }));

  return lista;
}

// ---------- Persistência (nuvem, um arranjo por usuário) ----------

export async function carregarLayout(): Promise<Layout | null> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user.id;
  if (!uid) return null;

  const { data } = await supabase
    .from("preferencias")
    .select("layout")
    .eq("user_id", uid)
    .maybeSingle();

  return data?.layout ? normalizarLayout(data.layout) : null;
}

export async function salvarLayout(layout: Layout): Promise<void> {
  const { data: auth } = await supabase.auth.getSession();
  const uid = auth.session?.user.id;
  if (!uid) return;

  await supabase.from("preferencias").upsert({
    user_id: uid,
    layout,
    atualizado_em: new Date().toISOString(),
  });
}
