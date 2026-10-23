// Busca de livros combinando duas fontes:
//  - Open Library (confiável, sem chave) — inclui livros de domínio público com PDF grátis.
//  - Google Books (complemento; instável e com cota, então é "best effort").
// O resultado prioriza livros gratuitos (PDF ou leitura online).

import { buscarExterno } from "./http";

export type Acesso = "pdf" | "online" | "emprestimo" | "pago";

export type Livro = {
  titulo: string;
  autores: string;
  capa: string | null;
  url: string; // link principal para ler/abrir
  acesso: Acesso;
  pdf: string | null; // link direto de download em PDF, quando disponível
  fonte: "openlibrary" | "google";
  ia?: string; // identificador no Internet Archive (para leitura embutida)
  googleId?: string; // id do volume no Google Books (para preview embutido)
};

const PESO: Record<Acesso, number> = {
  pdf: 0,
  online: 1,
  emprestimo: 2,
  pago: 3,
};

// ---------- Open Library ----------

type OLDoc = {
  title?: string;
  author_name?: string[];
  cover_i?: number;
  key?: string;
  ia?: string[];
  ebook_access?: string;
};

// Descobre o arquivo PDF real de um item do Internet Archive.
// Nem sempre o nome segue "{id}.pdf" (ex.: itens enviados manualmente).
async function resolverArquivoPublico(
  ia: string,
): Promise<{ pdf: string | null; url: string; acesso: Acesso }> {
  const detalhes = `https://archive.org/details/${ia}`;
  try {
    const res = await buscarExterno(`https://archive.org/metadata/${ia}`);
    if (!res.ok) return { pdf: null, url: detalhes, acesso: "online" };

    const m = await res.json();
    const restr = m?.metadata?.["access-restricted-item"];
    if (restr === true || restr === "true") {
      // Item de empréstimo — não dá para baixar direto.
      return { pdf: null, url: detalhes, acesso: "emprestimo" };
    }

    const files: { name?: string }[] = m?.files ?? [];
    const exato = files.find((f) => f.name === `${ia}.pdf`);
    const generico = files.find(
      (f) =>
        /\.pdf$/i.test(f.name ?? "") &&
        !/(_encrypted|_bw|_lcp)/i.test(f.name ?? ""),
    );
    const arquivo = exato ?? generico;

    if (arquivo?.name) {
      return {
        pdf: `https://archive.org/download/${ia}/${arquivo.name}`,
        url: detalhes,
        acesso: "pdf",
      };
    }
    return { pdf: null, url: detalhes, acesso: "online" };
  } catch {
    return { pdf: null, url: detalhes, acesso: "emprestimo" };
  }
}

async function buscarOpenLibrary(
  consulta: string,
  max: number,
): Promise<Livro[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", consulta);
  url.searchParams.set("limit", String(Math.max(max * 3, 8)));
  url.searchParams.set(
    "fields",
    "title,author_name,cover_i,key,ia,ebook_access,public_scan_b",
  );

  const res = await buscarExterno(url);
  if (!res.ok) throw new Error(`openlibrary ${res.status}`);
  const data = await res.json();

  const docs: OLDoc[] = data.docs ?? [];
  let resolvidos = 0;

  const livros = await Promise.all(
    docs.map(async (d): Promise<Livro> => {
      const capa = d.cover_i
        ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg`
        : null;
      const ia = (d.ia ?? [])[0];
      const paginaOL = d.key
        ? `https://openlibrary.org${d.key}`
        : "https://openlibrary.org";

      let acesso: Acesso = "pago";
      let pdf: string | null = null;
      let urlLivro = paginaOL;

      if (d.ebook_access === "public" && ia) {
        // Domínio público: tenta achar o PDF real (limita a 4 consultas de metadados).
        if (resolvidos < 4) {
          resolvidos++;
          const r = await resolverArquivoPublico(ia);
          acesso = r.acesso;
          pdf = r.pdf;
          urlLivro = r.url;
        } else {
          acesso = "online";
          urlLivro = `https://archive.org/details/${ia}`;
        }
      } else if (d.ebook_access === "borrowable") {
        // Empréstimo gratuito (precisa de conta gratuita).
        acesso = "emprestimo";
      } else if (d.ebook_access === "public") {
        acesso = "online";
      }

      return {
        titulo: d.title ?? "Sem título",
        autores: (d.author_name ?? []).slice(0, 2).join(", ") || "Desconhecido",
        capa,
        url: urlLivro,
        acesso,
        pdf,
        fonte: "openlibrary" as const,
        ia,
      };
    }),
  );

  return livros;
}

// ---------- Google Books ----------

type GBItem = {
  id?: string;
  volumeInfo?: {
    title?: string;
    authors?: string[];
    infoLink?: string;
    imageLinks?: { thumbnail?: string };
  };
  accessInfo?: {
    viewability?: string;
    webReaderLink?: string;
    pdf?: { isAvailable?: boolean; downloadLink?: string };
    epub?: { isAvailable?: boolean };
  };
};

async function buscarGoogle(
  consulta: string,
  max: number,
  comChave: boolean,
): Promise<Livro[]> {
  const key = process.env.GOOGLE_BOOKS_API_KEY;
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", consulta);
  url.searchParams.set("maxResults", String(max));
  if (comChave && key) url.searchParams.set("key", key);

  const res = await buscarExterno(url);
  if (!res.ok) throw new Error(`google ${res.status}`);
  const data = await res.json();

  return (data.items ?? []).map((it: GBItem) => {
    const vi = it.volumeInfo ?? {};
    const ai = it.accessInfo ?? {};

    let acesso: Acesso = "pago";
    let pdf: string | null = null;

    if (ai.pdf?.downloadLink) {
      acesso = "pdf";
      pdf = ai.pdf.downloadLink;
    } else if (
      ai.viewability === "ALL_PAGES" ||
      ai.pdf?.isAvailable ||
      ai.epub?.isAvailable
    ) {
      acesso = "online";
    }

    const ler = ai.webReaderLink ?? vi.infoLink ?? "#";

    return {
      titulo: vi.title ?? "Sem título",
      autores: (vi.authors ?? []).slice(0, 2).join(", ") || "Desconhecido",
      capa: vi.imageLinks?.thumbnail?.replace("http://", "https://") ?? null,
      url: ler,
      acesso,
      pdf,
      fonte: "google" as const,
      googleId: it.id,
    };
  });
}

// ---------- Combinação ----------

function chaveDedupe(l: Livro): string {
  return l.titulo
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 30);
}

function deduplicar(livros: Livro[]): Livro[] {
  const vistos = new Set<string>();
  const saida: Livro[] = [];
  for (const l of livros) {
    const k = chaveDedupe(l);
    if (!k || vistos.has(k)) continue;
    vistos.add(k);
    saida.push(l);
  }
  return saida;
}

export async function buscarLivros(
  consulta: string,
  max = 4,
  apenasGratis = false,
): Promise<Livro[]> {
  const [ol, gb] = await Promise.allSettled([
    buscarOpenLibrary(consulta, max),
    // Google Books é instável: tenta com a chave e, se falhar, sem chave.
    buscarGoogle(consulta, max, true).catch(() =>
      buscarGoogle(consulta, max, false),
    ),
  ]);

  let todos: Livro[] = [];
  if (ol.status === "fulfilled") todos.push(...ol.value);
  if (gb.status === "fulfilled") todos.push(...gb.value);

  if (apenasGratis) todos = todos.filter((l) => l.acesso !== "pago");

  todos = deduplicar(todos);
  todos.sort((a, b) => PESO[a.acesso] - PESO[b.acesso]);

  return todos.slice(0, max);
}
