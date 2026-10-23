export type Pergunta = {
  pergunta: string;
  opcoes: string[];
  correta: number;
  explicacao: string;
};
export type Tentativa = { data: string; acertos: number; total: number };
export type Topico = {
  id: string;
  recursoIndex: number;
  titulo: string;
  nivel: string;
  descricao: string;
  duracaoEstimada: string;
  buscaVideos: string;
  buscaLivros: string;
  buscaArtigos?: string;
  concluido?: boolean;
  nota?: string;
  quiz?: Pergunta[];
  tentativas?: Tentativa[];
  [key: string]: unknown;
};
export function identificarTopicos<T extends Record<string, unknown>>(
  topicos: T[],
): (T & { id: string; recursoIndex: number })[] {
  const usados = new Set<number>();
  let proximo =
    Math.max(
      -1,
      ...topicos.map((t, i) =>
        Number.isSafeInteger(t.recursoIndex) ? (t.recursoIndex as number) : i,
      ),
    ) + 1;
  const ids = new Set<string>();
  return topicos.map((t, i) => {
    let recursoIndex =
      Number.isSafeInteger(t.recursoIndex) && (t.recursoIndex as number) >= 0
        ? (t.recursoIndex as number)
        : i;
    if (usados.has(recursoIndex)) recursoIndex = proximo++;
    usados.add(recursoIndex);
    const id =
      typeof t.id === "string" && !ids.has(t.id) ? t.id : crypto.randomUUID();
    ids.add(id);
    return { ...t, id, recursoIndex };
  });
}
export function progresso(topicos: { concluido?: boolean }[]) {
  return topicos.length
    ? Math.round(
        (topicos.filter((t) => t.concluido).length / topicos.length) * 100,
      )
    : 0;
}
function objeto(x: unknown): Record<string, unknown> {
  if (!x || typeof x !== "object" || Array.isArray(x))
    throw new Error("Resposta da IA inválida.");
  return x as Record<string, unknown>;
}
function texto(x: unknown, max = 5000): string {
  if (typeof x !== "string" || !x.trim() || x.length > max)
    throw new Error("Resposta da IA incompleta.");
  return x.trim();
}
export function validarQuiz(x: unknown): Pergunta[] {
  if (!Array.isArray(x) || !x.length || x.length > 20)
    throw new Error("Quiz inválido.");
  return x.map((item) => {
    const q = objeto(item);
    if (
      !Array.isArray(q.opcoes) ||
      q.opcoes.length !== 4 ||
      !Number.isInteger(q.correta) ||
      (q.correta as number) < 0 ||
      (q.correta as number) > 3
    )
      throw new Error("Alternativas inválidas.");
    return {
      pergunta: texto(q.pergunta),
      opcoes: q.opcoes.map((o) => texto(o)),
      correta: q.correta as number,
      explicacao: texto(q.explicacao),
    };
  });
}
export function validarCards(x: unknown) {
  if (!Array.isArray(x) || !x.length || x.length > 30)
    throw new Error("Flashcards inválidos.");
  return x.map((item) => {
    const f = objeto(item);
    return { frente: texto(f.frente), verso: texto(f.verso) };
  });
}
export function validarPlano(x: unknown) {
  const r = objeto(x);
  if (!Array.isArray(r.topicos) || !r.topicos.length || r.topicos.length > 30)
    throw new Error("Tópicos inválidos.");
  return {
    tema: texto(r.tema, 500),
    descricao: texto(r.descricao),
    topicos: identificarTopicos(
      r.topicos.map((item) => {
        const t = objeto(item);
        const nivel = texto(t.nivel);
        if (!["iniciante", "intermediario", "avancado"].includes(nivel))
          throw new Error("Nível inválido.");
        return {
          titulo: texto(t.titulo),
          descricao: texto(t.descricao),
          nivel,
          duracaoEstimada: texto(t.duracaoEstimada, 100),
          buscaVideos: texto(t.buscaVideos, 500),
          buscaLivros: texto(t.buscaLivros, 500),
          buscaArtigos: texto(t.buscaArtigos, 500),
        };
      }),
    ),
  };
}
