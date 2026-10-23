// Busca de artigos científicos gratuitos, combinando fontes sem chave de API:
//  - arXiv — preprints (STEM) com PDF livre.
//  - Europe PMC — biomédicas e ciências da vida, com filtro de acesso aberto.
//  - DOAJ — revistas de acesso aberto (todas as áreas).
// Prioriza resultados com PDF acessível.

import { buscarExterno } from "./http";

export type Artigo = {
  titulo: string;
  autores: string;
  ano?: string;
  resumo?: string;
  revista?: string;
  url: string; // página do artigo / DOI
  pdf?: string; // PDF de acesso aberto, quando disponível
  fonte: "arxiv" | "epmc" | "doaj";
  acesso: "pdf" | "online";
};

const TRECHO = 400;

const ENTIDADES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&mdash;": "—",
  "&ndash;": "–",
};

function limpar(texto?: string | null): string | undefined {
  if (!texto) return undefined;
  const t = texto
    .replace(/&[a-z#0-9]+;/gi, (m) => ENTIDADES[m.toLowerCase()] ?? " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return t || undefined;
}

function encurtar(texto?: string | null): string | undefined {
  const t = limpar(texto);
  if (!t) return undefined;
  return t.length > TRECHO ? t.slice(0, TRECHO).trimEnd() + "…" : t;
}

// ---------- arXiv ----------

async function buscarArxiv(consulta: string, max: number): Promise<Artigo[]> {
  const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(
    consulta,
  )}&start=0&max_results=${max}`;

  const res = await buscarExterno(url, {
    headers: { "User-Agent": "study-planner/1.0" },
  });
  if (!res.ok) throw new Error(`arxiv ${res.status}`);
  const xml = await res.text();

  return xml
    .split("<entry>")
    .slice(1)
    .map((e): Artigo => {
      const pega = (tag: string) => {
        const m = e.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
        return m ? m[1].replace(/\s+/g, " ").trim() : "";
      };
      const linkPdf = e.match(/<link[^>]*title="pdf"[^>]*\/?>/)?.[0];
      const pdf = linkPdf?.match(/href="([^"]+)"/)?.[1];
      const autores = [
        ...e.matchAll(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>/g),
      ]
        .map((m) => limpar(m[1]) ?? "")
        .filter(Boolean)
        .slice(0, 3)
        .join(", ");

      return {
        titulo: limpar(pega("title")) ?? "Sem título",
        autores: autores || "Desconhecido",
        ano: pega("published").slice(0, 4) || undefined,
        resumo: encurtar(pega("summary")),
        url: pega("id"),
        pdf: pdf ?? undefined,
        fonte: "arxiv",
        acesso: pdf ? "pdf" : "online",
      };
    });
}

// ---------- Europe PMC ----------

type EpmcResultado = {
  id?: string;
  source?: string;
  doi?: string;
  title?: string;
  authorString?: string;
  pubYear?: string | number;
  abstractText?: string;
  journalTitle?: string;
  journalInfo?: { journal?: { title?: string } };
  isOpenAccess?: string;
  fullTextUrlList?: { fullTextUrl?: { url?: string; documentStyle?: string }[] };
};

async function buscarEpmc(consulta: string, max: number): Promise<Artigo[]> {
  const url = new URL(
    "https://www.ebi.ac.uk/europepmc/webservices/rest/search",
  );
  url.searchParams.set("query", `${consulta} AND OPEN_ACCESS:Y`);
  url.searchParams.set("format", "json");
  url.searchParams.set("resultType", "core");
  url.searchParams.set("pageSize", String(Math.max(max * 2, 8)));

  const res = await buscarExterno(url);
  if (!res.ok) throw new Error(`epmc ${res.status}`);
  const data = await res.json();

  return ((data?.resultList?.result ?? []) as EpmcResultado[])
    .filter((r) => r.isOpenAccess === "Y")
    .map((r): Artigo => {
      const urls = r.fullTextUrlList?.fullTextUrl ?? [];
      const pdf = urls.find((u) => u.documentStyle === "pdf" && u.url)?.url;
      const pagina = r.doi
        ? `https://doi.org/${r.doi}`
        : (urls[0]?.url ?? `https://europepmc.org/article/${r.source}/${r.id}`);

      return {
        titulo: limpar(r.title) ?? "Sem título",
        autores: limpar(r.authorString) ?? "Desconhecido",
        ano: r.pubYear ? String(r.pubYear) : undefined,
        resumo: encurtar(r.abstractText),
        revista: limpar(r.journalInfo?.journal?.title ?? r.journalTitle),
        url: pagina,
        pdf: pdf ?? undefined,
        fonte: "epmc",
        acesso: pdf ? "pdf" : "online",
      };
    });
}

// ---------- DOAJ ----------

type DoajItem = {
  bibjson?: {
    title?: string;
    year?: string | number;
    abstract?: string;
    journal?: { title?: string };
    author?: { name?: string }[];
    link?: { type?: string; url?: string }[];
    identifier?: { type?: string; id?: string }[];
  };
};

async function buscarDoaj(consulta: string, max: number): Promise<Artigo[]> {
  const url = `https://doaj.org/api/search/articles/${encodeURIComponent(
    consulta,
  )}?pageSize=${Math.max(max * 2, 8)}`;

  const res = await buscarExterno(url);
  if (!res.ok) throw new Error(`doaj ${res.status}`);
  const data = await res.json();

  return ((data.results ?? []) as DoajItem[]).map((item): Artigo => {
    const b = item.bibjson ?? {};
    const links = b.link ?? [];
    const pdf = links.find(
      (l) => /pdf/i.test(l.type ?? "") || /\.pdf($|\?)/i.test(l.url ?? ""),
    )?.url;
    const pagina =
      links.find((l) => l.type === "fulltext")?.url ?? links[0]?.url ?? "";
    const doi = (b.identifier ?? []).find((i) => i.type === "doi")?.id;

    return {
      titulo: limpar(b.title) ?? "Sem título",
      autores:
        (b.author ?? [])
          .map((a) => a?.name)
          .filter(Boolean)
          .slice(0, 3)
          .join(", ") || "Desconhecido",
      ano: b.year ? String(b.year) : undefined,
      resumo: encurtar(b.abstract),
      revista: limpar(b.journal?.title),
      url: doi ? `https://doi.org/${doi}` : pagina,
      pdf: pdf ?? undefined,
      fonte: "doaj",
      acesso: pdf ? "pdf" : "online",
    };
  });
}

// ---------- Combinação ----------

function chave(a: Artigo): string {
  return a.titulo
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 30);
}

export async function buscarArtigos(
  consulta: string,
  max = 6,
): Promise<Artigo[]> {
  const resultados = await Promise.allSettled([
    buscarArxiv(consulta, max),
    buscarEpmc(consulta, max),
    buscarDoaj(consulta, max),
  ]);

  // Remove duplicados entre fontes (mesmo título).
  const vistos = new Set<string>();
  const listas: Artigo[][] = [];
  for (const r of resultados) {
    if (r.status !== "fulfilled") continue;
    const limpa = r.value.filter((a) => {
      const k = chave(a);
      if (!k || vistos.has(k)) return false;
      vistos.add(k);
      return true;
    });
    // Dentro de cada fonte, os com PDF vêm primeiro.
    limpa.sort((a, b) => Number(Boolean(b.pdf)) - Number(Boolean(a.pdf)));
    listas.push(limpa);
  }

  // Intercala as fontes (1 de cada por vez) para dar variedade.
  const saida: Artigo[] = [];
  while (saida.length < max && listas.some((l) => l.length > 0)) {
    for (const lista of listas) {
      if (saida.length >= max) break;
      const item = lista.shift();
      if (item) saida.push(item);
    }
  }

  return saida;
}
