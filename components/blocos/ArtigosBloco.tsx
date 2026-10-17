"use client";

import { useEffect, useState } from "react";

const NOME_FONTE: Record<string, string> = {
  arxiv: "arXiv",
  epmc: "Europe PMC",
  doaj: "DOAJ",
};

/** Bloco de artigos científicos gratuitos (arXiv, Europe PMC, DOAJ). */
export default function ArtigosBloco({ topico }: { topico: any }) {
  const [artigos, setArtigos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<number | null>(null);

  useEffect(() => {
    let vivo = true;
    const q =
      topico?.buscaArtigos ?? topico?.buscaLivros ?? topico?.titulo ?? "";
    setCarregando(true);
    setAberto(null);
    fetch(`/api/search-articles?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => vivo && setArtigos(Array.isArray(d) ? d : []))
      .catch(() => vivo && setArtigos([]))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [topico?.buscaArtigos, topico?.buscaLivros, topico?.titulo]);

  if (carregando)
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500">
        Buscando artigos...
      </p>
    );
  if (artigos.length === 0)
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500">
        Nenhum artigo encontrado.
      </p>
    );

  return (
    <div className="space-y-2">
      {artigos.map((a: any, k: number) => (
        <div
          key={k}
          className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
        >
          <p className="text-sm font-medium">{a.titulo}</p>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {a.autores}
            {a.ano ? ` · ${a.ano}` : ""}
            {a.revista ? ` · ${a.revista}` : ""}
          </p>
          {a.resumo && (
            <>
              <p
                className={`mt-2 text-xs text-slate-600 dark:text-slate-300 ${
                  aberto === k ? "" : "line-clamp-3"
                }`}
              >
                {a.resumo}
              </p>
              <button
                onClick={() => setAberto(aberto === k ? null : k)}
                className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                {aberto === k ? "Mostrar menos" : "Ler resumo"}
              </button>
            </>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {a.pdf && (
              <a
                href={a.pdf}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-green-600 hover:underline dark:text-green-400"
              >
                📄 PDF grátis
              </a>
            )}
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 hover:underline dark:text-blue-400"
            >
              Ver no site ↗
            </a>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {NOME_FONTE[a.fonte] ?? a.fonte}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
