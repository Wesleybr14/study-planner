"use client";

import { useEffect, useState } from "react";
import SeletorArquivos, { BotaoAdicionar } from "@/components/SeletorArquivos";
import LeitorArquivo from "@/components/LeitorArquivo";
import { useArquivos } from "@/components/useArquivos";
import type { Arquivo } from "@/lib/arquivos";

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

type Opcao =
  | { tipo: "arquivo"; k: string; a: Arquivo }
  | { tipo: "web"; k: string; l: any };

/** Bloco de livros: busca Open Library/Google Books e permite ler embutido. */
export default function LivrosBloco({
  topico,
  roteiroId,
  indice,
  compacto = false,
}: {
  topico: any;
  roteiroId: string;
  indice: number;
  compacto?: boolean;
}) {
  const [livros, setLivros] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [soGratis, setSoGratis] = useState(false);
  const [aberto, setAberto] = useState<number | null>(null);
  const [sel, setSel] = useState("");

  // Arquivos do usuário (locais + nuvem) para este tópico.
  const arq = useArquivos(roteiroId, indice, "livro");

  useEffect(() => {
    let vivo = true;
    const q = topico?.buscaLivros ?? topico?.titulo ?? "";
    setCarregando(true);
    setAberto(null);
    setSel("");
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

  const capa = (l: any) =>
    l.capa ? (
      <img
        src={l.capa}
        alt=""
        referrerPolicy="no-referrer"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
        className="h-20 w-14 shrink-0 rounded object-cover"
      />
    ) : (
      <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded bg-slate-200 text-xl dark:bg-slate-700">
        📕
      </div>
    );

  const links = (l: any) => (
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
  );

  const filtroGratis = (
    <label className="flex shrink-0 cursor-pointer items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
      <input
        type="checkbox"
        checked={soGratis}
        onChange={(e) => setSoGratis(e.target.checked)}
        className="h-3.5 w-3.5 accent-green-500"
      />
      só grátis
    </label>
  );

  // Modo compacto (workspace): escolhe entre seus arquivos e os livros da busca.
  if (compacto) {
    const opcoes: Opcao[] = [
      ...arq.itens.map((a) => ({
        tipo: "arquivo" as const,
        k: `arq:${a.id}`,
        a,
      })),
      ...livros.map((l, i) => ({ tipo: "web" as const, k: `web:${i}`, l })),
    ];
    const atual = opcoes.find((o) => o.k === sel) ?? opcoes[0];
    const a = atual?.tipo === "arquivo" ? atual.a : null;

    return (
      <div className="flex h-full flex-col gap-1.5">
        <div className="flex shrink-0 items-center gap-2">
          {opcoes.length > 1 ? (
            <select
              value={atual?.k ?? ""}
              onChange={(e) => setSel(e.target.value)}
              title="Trocar de livro/arquivo"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            >
              {arq.itens.length > 0 && (
                <optgroup label="No seu computador">
                  {arq.itens.map((x) => (
                    <option key={`arq:${x.id}`} value={`arq:${x.id}`}>
                      {x.origem === "nuvem" ? "☁️" : "📁"} {x.nome}
                    </option>
                  ))}
                </optgroup>
              )}
              {livros.length > 0 && (
                <optgroup label="Resultados da busca">
                  {livros.map((l, i) => (
                    <option key={`web:${i}`} value={`web:${i}`}>
                      {l.titulo}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          ) : (
            <span className="min-w-0 flex-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
              {atual?.tipo === "arquivo"
                ? atual.a.nome
                : atual?.tipo === "web"
                  ? atual.l.titulo
                  : carregando
                    ? "Buscando livros..."
                    : "Nenhum livro encontrado"}
            </span>
          )}
          <BotaoAdicionar compacto onArquivos={(f) => void arq.adicionar(f)} />
          {filtroGratis}
        </div>

        {a && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {a.origem === "local" ? "📁 neste aparelho" : "☁️ na nuvem"}
            </span>
            {a.origem === "local" && (
              <button
                type="button"
                onClick={() => void arq.subir(a).catch(() => {})}
                title="Salvar na nuvem"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                ☁️ Salvar na nuvem
              </button>
            )}
            <button
              type="button"
              onClick={() => void arq.remover(a)}
              className="text-red-600 hover:underline dark:text-red-400"
            >
              🗑 Remover
            </button>
          </div>
        )}

        {atual?.tipo === "arquivo" ? (
          <LeitorArquivo
            arquivo={atual.a}
            obterBlob={arq.obterBlob}
            className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
          />
        ) : atual?.tipo === "web" ? (
          <LeituraWeb livro={atual.l} />
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {carregando
              ? "Buscando livros..."
              : `Nenhum livro encontrado${soGratis ? " gratuito" : ""}.`}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <SeletorArquivos
        locais={arq.locais}
        nuvem={arq.nuvem}
        carregando={arq.carregando}
        acoes={arq}
        alturaLeitor="30rem"
      />

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
                {capa(l)}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{l.titulo}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {l.autores}
                  </p>
                  {links(l)}
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
    </div>
  );
}

/** Leitura de um livro da busca (embed quando disponível, senão capa/links). */
function LeituraWeb({ livro: l }: { livro: any }) {
  const embed = embedLivro(l);
  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
        <span className={estiloAcesso(l.acesso)}>
          {ROTULO_ACESSO[l.acesso] ?? ""}
        </span>
        {l.pdf && (
          <a
            href={l.pdf}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-green-600 hover:underline dark:text-green-400"
          >
            📥 PDF
          </a>
        )}
        <a
          href={l.url}
          target="_blank"
          rel="noreferrer"
          title="Ver no site"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          ↗
        </a>
        <span className="min-w-0 flex-1 truncate text-slate-400 dark:text-slate-500">
          {l.autores}
        </span>
      </div>
      {embed ? (
        <iframe
          src={embed}
          title={l.titulo}
          allowFullScreen
          className="min-h-0 w-full flex-1 rounded-lg border border-slate-200 dark:border-slate-700"
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 p-3 dark:border-slate-700">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Sem leitura embutida — use os links acima.
          </p>
        </div>
      )}
    </>
  );
}
