// Mapa mental: árvore de conceitos de um tópico (salva em topico.mapa) e o
// layout em árvore usado tanto por ele quanto pelo mapa do roteiro.

export type NoMapa = {
  id: string;
  texto: string;
  filhos: NoMapa[];
  recolhido?: boolean;
};

export const MAX_TEXTO_NO = 80;
const MAX_NOS = 200;
const MAX_PROFUNDIDADE = 6;

export function novoNo(texto: string, filhos: NoMapa[] = []): NoMapa {
  return { id: crypto.randomUUID(), texto, filhos };
}

/** Monta o mapa a partir da resposta da IA (centro + ramos com ideias). */
export function mapaDaIA(
  centro: string,
  ramos: { texto: string; ideias: string[] }[],
): NoMapa {
  return novoNo(
    centro,
    ramos.map((r) =>
      novoNo(
        r.texto,
        r.ideias.map((i) => novoNo(i)),
      ),
    ),
  );
}

/** Confere um mapa vindo do banco, de um backup ou da IA. */
export function validarMapa(x: unknown): NoMapa {
  let total = 0;
  const ids = new Set<string>();
  function no(v: unknown, prof: number): NoMapa {
    if (!v || typeof v !== "object" || Array.isArray(v))
      throw new Error("Mapa mental inválido.");
    const o = v as Record<string, unknown>;
    const texto = typeof o.texto === "string" ? o.texto.trim() : "";
    if (!texto || texto.length > MAX_TEXTO_NO)
      throw new Error("Mapa mental com conceito vazio ou longo demais.");
    if (++total > MAX_NOS || prof > MAX_PROFUNDIDADE)
      throw new Error("Mapa mental grande demais.");
    const filhos = Array.isArray(o.filhos) ? o.filhos : [];
    const id =
      typeof o.id === "string" && o.id && !ids.has(o.id)
        ? o.id
        : crypto.randomUUID();
    ids.add(id);
    return {
      id,
      texto,
      filhos: filhos.map((f) => no(f, prof + 1)),
      ...(o.recolhido === true && { recolhido: true }),
    };
  }
  return no(x, 0);
}

export function contarNos(n: NoMapa): number {
  return 1 + n.filhos.reduce((s, f) => s + contarNos(f), 0);
}

// ---------- Edição (sempre devolve uma árvore nova) ----------

function mapear(n: NoMapa, id: string, fn: (n: NoMapa) => NoMapa): NoMapa {
  if (n.id === id) return fn(n);
  return { ...n, filhos: n.filhos.map((f) => mapear(f, id, fn)) };
}

export function renomearNo(raiz: NoMapa, id: string, texto: string) {
  const t = texto.trim().slice(0, MAX_TEXTO_NO);
  return t ? mapear(raiz, id, (n) => ({ ...n, texto: t })) : raiz;
}

export function adicionarFilho(raiz: NoMapa, id: string, filho: NoMapa) {
  return mapear(raiz, id, (n) => ({
    ...n,
    recolhido: false,
    filhos: [...n.filhos, filho],
  }));
}

export function removerNo(raiz: NoMapa, id: string): NoMapa {
  return {
    ...raiz,
    filhos: raiz.filhos.filter((f) => f.id !== id).map((f) => removerNo(f, id)),
  };
}

export function alternarRecolhido(raiz: NoMapa, id: string) {
  return mapear(raiz, id, (n) => ({ ...n, recolhido: !n.recolhido }));
}

export function acharNo(raiz: NoMapa, id: string): NoMapa | null {
  if (raiz.id === id) return raiz;
  for (const f of raiz.filhos) {
    const n = acharNo(f, id);
    if (n) return n;
  }
  return null;
}

export function acharPai(raiz: NoMapa, id: string): NoMapa | null {
  for (const f of raiz.filhos) {
    if (f.id === id) return raiz;
    const p = acharPai(f, id);
    if (p) return p;
  }
  return null;
}

// ---------- Layout ----------

/** Nó genérico para desenhar: o mapa do tópico e o do roteiro usam o mesmo. */
export type NoArvore = {
  id: string;
  texto: string;
  filhos: NoArvore[];
  recolhido?: boolean;
};

export type NoPosicionado = {
  no: NoArvore;
  x: number;
  y: number; // centro vertical
  w: number;
  pai: NoPosicionado | null;
};

export const ALTURA_NO = 32;
export const LINHA_NO = 44;
export const ESPACO_COLUNA = 56;
export const LARGURA_MAX_NO = 260;

/**
 * Árvore da esquerda para a direita: cada folha visível ocupa uma linha e o
 * pai fica no meio dos filhos. As colunas têm a largura do maior nó delas.
 */
export function posicionar(
  raiz: NoArvore,
  medir: (no: NoArvore, profundidade: number) => number,
) {
  const colunas: number[] = [];
  const nos: (NoPosicionado & { d: number })[] = [];
  let folhas = 0;
  function andar(
    no: NoArvore,
    d: number,
    pai: NoPosicionado | null,
  ): NoPosicionado {
    const w = Math.min(LARGURA_MAX_NO, Math.ceil(medir(no, d)) + 28);
    colunas[d] = Math.max(colunas[d] ?? 0, w);
    const p = { no, x: 0, y: 0, w, pai, d };
    nos.push(p);
    const visiveis = no.recolhido ? [] : no.filhos;
    if (!visiveis.length) p.y = folhas++ * LINHA_NO + LINHA_NO / 2;
    else {
      const filhos = visiveis.map((f) => andar(f, d + 1, p));
      p.y = (filhos[0].y + filhos[filhos.length - 1].y) / 2;
    }
    return p;
  }
  andar(raiz, 0, null);
  const xs = [0];
  for (let i = 1; i < colunas.length; i++)
    xs[i] = xs[i - 1] + colunas[i - 1] + ESPACO_COLUNA;
  for (const p of nos) p.x = xs[p.d];
  const ultima = colunas.length - 1;
  return {
    nos: nos as NoPosicionado[],
    largura: xs[ultima] + colunas[ultima] + 16,
    altura: folhas * LINHA_NO,
  };
}
