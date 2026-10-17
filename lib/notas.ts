/**
 * Anotações em "markdown simples", livres de React (por isso testável isolado).
 *
 * Sintaxe suportada:
 *   # Título      ## Subtítulo
 *   - item        (lista com marcador / "tópicos")
 *   - [ ] item     tarefa (riscada quando - [x])
 *   1. item        lista numerada
 *   > citação
 *   ---            régua
 *   **negrito**  *itálico*  ~~riscado~~  ==grifado==  [link](url)
 */

export type Token =
  | { t: string }
  | { t: string; m: "negrito" | "italico" | "riscado" | "grifado" }
  | { t: string; link: string };

/** `linha` é o índice na fonte (para alternar a tarefa ao clicar). */
export type ItemNota = { linha: number; tokens: Token[]; feito?: boolean };

export type BlocoNota =
  | { tipo: "titulo"; nivel: 1 | 2; tokens: Token[] }
  | { tipo: "paragrafo"; tokens: Token[] }
  | { tipo: "lista"; itens: ItemNota[] }
  | { tipo: "tarefas"; itens: ItemNota[] }
  | { tipo: "numerada"; itens: ItemNota[] }
  | { tipo: "citacao"; itens: ItemNota[] }
  | { tipo: "regra" };

/** Classifica uma marcação encontrada pela expressão do `tokenizarInline`. */
function classificar(t: string): Token {
  if (t.startsWith("**") && t.endsWith("**"))
    return { t: t.slice(2, -2), m: "negrito" };
  if (t.startsWith("~~") && t.endsWith("~~"))
    return { t: t.slice(2, -2), m: "riscado" };
  if (t.startsWith("==") && t.endsWith("=="))
    return { t: t.slice(2, -2), m: "grifado" };
  const link = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(t);
  if (link) return { t: link[1], link: link[2] };
  if (t.startsWith("*") && t.endsWith("*"))
    return { t: t.slice(1, -1), m: "italico" };
  return { t };
}

/** Quebra um texto em tokens com formatação em linha. */
export function tokenizarInline(texto: string): Token[] {
  const re =
    /(\*\*[^*]+\*\*|~~[^~]+~~|==[^=]+==|\[[^\]]+\]\([^)]+\)|\*[^*\n]+\*)/g;
  const out: Token[] = [];
  let fim = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    if (m.index > fim) out.push({ t: texto.slice(fim, m.index) });
    out.push(classificar(m[0]));
    fim = m.index + m[0].length;
  }
  if (fim < texto.length) out.push({ t: texto.slice(fim) });
  return out;
}

/** Converte o texto das anotações em blocos estruturados. */
export function parseNota(texto: string): BlocoNota[] {
  const linhas = texto.split("\n");
  const out: BlocoNota[] = [];
  let i = 0;

  while (i < linhas.length) {
    const linha = linhas[i];

    if (linha.trim() === "") {
      i++;
      continue;
    }
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(linha.trim())) {
      out.push({ tipo: "regra" });
      i++;
      continue;
    }

    const h1 = /^#\s+(.*)$/.exec(linha);
    if (h1) {
      out.push({ tipo: "titulo", nivel: 1, tokens: tokenizarInline(h1[1]) });
      i++;
      continue;
    }
    const h2 = /^##\s+(.*)$/.exec(linha);
    if (h2) {
      out.push({ tipo: "titulo", nivel: 2, tokens: tokenizarInline(h2[1]) });
      i++;
      continue;
    }

    // Tarefas (checklist).
    if (/^[-*]\s+\[[ xX]\]/.test(linha)) {
      const itens: ItemNota[] = [];
      while (i < linhas.length && /^[-*]\s+\[[ xX]\]/.test(linhas[i])) {
        const m = /^[-*]\s+\[([ xX])\]\s*(.*)$/.exec(linhas[i]);
        if (m)
          itens.push({
            linha: i,
            feito: m[1].toLowerCase() === "x",
            tokens: tokenizarInline(m[2]),
          });
        i++;
      }
      out.push({ tipo: "tarefas", itens });
      continue;
    }

    // Tópicos (lista com marcador).
    if (/^[-*]\s+/.test(linha)) {
      const itens: ItemNota[] = [];
      while (i < linhas.length && /^[-*]\s+/.test(linhas[i])) {
        const m = /^[-*]\s+(.*)$/.exec(linhas[i]);
        if (m) itens.push({ linha: i, tokens: tokenizarInline(m[1]) });
        i++;
      }
      out.push({ tipo: "lista", itens });
      continue;
    }

    // Itens numerados.
    if (/^\d+[.)]\s+/.test(linha)) {
      const itens: ItemNota[] = [];
      while (i < linhas.length && /^\d+[.)]\s+/.test(linhas[i])) {
        const m = /^\d+[.)]\s+(.*)$/.exec(linhas[i]);
        if (m) itens.push({ linha: i, tokens: tokenizarInline(m[1]) });
        i++;
      }
      out.push({ tipo: "numerada", itens });
      continue;
    }

    // Citação.
    if (/^>\s?/.test(linha)) {
      const itens: ItemNota[] = [];
      while (i < linhas.length && /^>\s?/.test(linhas[i])) {
        itens.push({
          linha: i,
          tokens: tokenizarInline(linhas[i].replace(/^>\s?/, "")),
        });
        i++;
      }
      out.push({ tipo: "citacao", itens });
      continue;
    }

    out.push({ tipo: "paragrafo", tokens: tokenizarInline(linha) });
    i++;
  }

  return out;
}

/** Marca/desmarca a tarefa da linha (usado pelos checkboxes da visualização). */
export function alternarTarefa(texto: string, linha: number): string {
  const linhas = texto.split("\n");
  const alvo = linhas[linha];
  if (alvo == null) return texto;
  const trocado = alvo.replace(
    /^([-*]\s+)\[([ xX])\]/,
    (_m, marca: string, estado: string) =>
      marca + (estado.toLowerCase() === "x" ? "[ ]" : "[x]"),
  );
  return linhas.map((x, k) => (k === linha ? trocado : x)).join("\n");
}

/** Cerca a seleção com uma marcação (ou insere o marcador com texto padrão). */
export function envolverTexto(
  value: string,
  ini: number,
  fim: number,
  abre: string,
  fecha: string,
) {
  const sel = value.slice(ini, fim) || "texto";
  const novo = value.slice(0, ini) + abre + sel + fecha + value.slice(fim);
  return {
    novo,
    iniSel: ini + abre.length,
    fimSel: ini + abre.length + sel.length,
  };
}

/** Acrescenta uma marca de lista no início da linha do cursor. */
export function prefixarLinha(
  value: string,
  cursor: number,
  marca: string,
): { novo: string; cursor: number } {
  const inicio = value.lastIndexOf("\n", cursor - 1) + 1;
  const novo = value.slice(0, inicio) + marca + value.slice(inicio);
  return { novo, cursor: cursor + marca.length };
}
