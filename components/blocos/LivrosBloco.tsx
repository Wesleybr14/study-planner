"use client";

import { useEffect, useState } from "react";

const ROTULO_ACESSO: Record<string, string> = {
  pdf: "📥 PDF grátis",
  online: "🔓 Ler online",
  emprestimo: "📚 Empréstimo grátis",
  pago: "🔒 Pago",
};

function estiloAcesso(acesso: string): string {
  const base = "rounded-full px-2 py-0.5 text-[10px] font-medium ";
  return acesso === "pago"
    ? base + "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
    : base +
        "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300";
}

/** Endereço de leitura embutida de um livro, quando existir. */
function embedLivro(l: any): string | null {
  if (l.ia) return `https://archive.org/embed/${l.ia}`;
  if (l.fonte === "google" && l.googleId)
    return `https://books.google.com/books?id=${l.googleId}&output=embed`;
  return null;
}

/** Bloco de livros: busca Open Library/Google Books e permite ler embutido. */
export default function LivrosBloco({ topico }: { topico: any }) {
  const [livros, setLivros] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [soGratis, setSoGratis] = useState(false);
  const [aberto, setAberto] = useState<number | null>(null);

  useEffect(() => {
    let vivo = true;
    const q = topico?.buscaLivros ?? topico?.titulo ?? "";
    setCarregando(true);
    setAberto(null);
    fetch(
      `/api/search-books?q=${encodeURIComponent(q)}${soGratis ? "&gratis=1" : ""}`,
    )
      .then((r) => r.json())
      .then((d) => vivo && setLivros(Array.isArray(d) ? d : []))
      .catch(() => vivo && setLivros([]))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [topico?.buscaLivros, topico?.titulo, soGratis]);

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <input
          type="checkbox"
          checked={soGratis}
          onChange={(e) => setSoGratis(e.target.checked)}
          className="h-3.5 w-3.5 accent-green-500"
        />
        Só gratuitos
      </label>

      {carregando && (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Buscando livros...
        </p>
      )}
      {!carregando && livros.length === 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Nenhum livro encontrado{soGratis ? " gratuito" : ""}.
        </p>
      )}

      {livros.map((l: any, k: number) => {
        const embed = embedLivro(l);
        return (
          <div
            key={k}
            className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
          >
            <div className="flex gap-3 p-2">
              {l.capa ? (
                <img
                  src={l.capa}
                  alt=""
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display =
                      "none";
                  }}
                  className="h-20 w-14 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded bg-slate-200 text-xl dark:bg-slate-700">
                  📕
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{l.titulo}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {l.autores}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className={estiloAcesso(l.acesso)}>
                    {ROTULO_ACESSO[l.acesso] ?? ""}
                  </span>
                  {l.pdf && (
                    <a
                      href={l.pdf}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-green-600 hover:underline dark:text-green-400"
                    >
                      📥 Baixar PDF
                    </a>
                  )}
                  <a
                    href={l.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    Ver no site ↗
                  </a>
                </div>
                {embed && (
                  <button
                    onClick={() => setAberto(aberto === k ? null : k)}
                    className="mt-2 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    {aberto === k ? "Fechar leitura" : "📖 Ler aqui"}
                  </button>
                )}
              </div>
            </div>
            {embed && aberto === k && (
              <iframe
                src={embed}
                title={l.titulo}
                allowFullScreen
                className="h-[26rem] w-full border-t border-slate-200 dark:border-slate-700"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
