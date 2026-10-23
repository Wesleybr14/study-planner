"use client";
import { apiFetch } from "@/lib/api-client";

import { useEffect, useState } from "react";
import SeletorArquivos, {
  Aviso,
  BotaoAdicionar,
} from "@/components/SeletorArquivos";
import { AreaSoltar } from "@/components/SoltarArquivos";
import LeitorArquivo from "@/components/LeitorArquivo";
import { useArquivos } from "@/components/useArquivos";
import type { Arquivo } from "@/lib/arquivos";

const NOME_FONTE: Record<string, string> = {
  arxiv: "arXiv",
  epmc: "Europe PMC",
  doaj: "DOAJ",
};

type Opcao =
  | { tipo: "arquivo"; k: string; a: Arquivo }
  | { tipo: "web"; k: string; a2: any };

/** Bloco de artigos científicos gratuitos (arXiv, Europe PMC, DOAJ). */
export default function ArtigosBloco({
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
  const [artigos, setArtigos] = useState<any[]>([]);
  const [erroBusca, setErroBusca] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [aberto, setAberto] = useState<number | null>(null);
  const memoria = `material:Artigos:${roteiroId}:${indice}`;
  const [sel, setSel] = useState("");
  const [aviso, setAviso] = useState("");

  // Arquivos do usuário (locais + nuvem) para este tópico.
  const arq = useArquivos(roteiroId, indice, "artigo");

  /** Adiciona arquivos (botão ou arrastar-e-soltar) e mostra possíveis erros. */
  async function soltar(files: File[]) {
    setAviso("");
    const erros = await arq.adicionar(files);
    if (erros.length) setAviso(erros.join(" "));
  }

  useEffect(() => {
    let vivo = true;
    const q =
      topico?.buscaArtigos ?? topico?.buscaLivros ?? topico?.titulo ?? "";
    setCarregando(true);
    setErroBusca("");
    setAberto(null);
    try {
      setSel(localStorage.getItem(memoria) ?? "");
    } catch {
      setSel("");
    }
    apiFetch(`/api/search-articles?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => vivo && setArtigos(Array.isArray(d) ? d : []))
      .catch((e: Error) => {
        if (vivo) {
          setArtigos([]);
          setErroBusca(e.message);
        }
      })
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [topico?.buscaArtigos, topico?.buscaLivros, topico?.titulo, memoria]);

  const metaArtigo = (a: any) => (
    <p className="text-xs text-slate-500 dark:text-slate-400">
      {a.autores}
      {a.ano ? ` · ${a.ano}` : ""}
      {a.revista ? ` · ${a.revista}` : ""}
    </p>
  );

  const linksArtigo = (a: any) => (
    <div className="flex flex-wrap items-center gap-2">
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
  );

  // Modo compacto (workspace): escolhe entre seus arquivos e os artigos.
  if (compacto) {
    const opcoes: Opcao[] = [
      ...arq.itens.map((a) => ({
        tipo: "arquivo" as const,
        k: `arq:${a.id}`,
        a,
      })),
      ...artigos.map((a2) => ({
        tipo: "web" as const,
        k: `web:${a2.url}`,
        a2,
      })),
    ];
    const atual = opcoes.find((o) => o.k === sel) ?? opcoes[0];
    const f = atual?.tipo === "arquivo" ? atual.a : null;

    return (
      <AreaSoltar
        onArquivos={(files) => void soltar(files)}
        className="flex h-full flex-col gap-2"
      >
        <div className="flex shrink-0 items-center gap-2">
          {opcoes.length > 1 ? (
            <select
              value={atual?.k ?? ""}
              onChange={(e) => {
                setSel(e.target.value);
                try {
                  localStorage.setItem(memoria, e.target.value);
                } catch {}
              }}
              title="Trocar de artigo/arquivo"
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
              {artigos.length > 0 && (
                <optgroup label="Resultados da busca">
                  {artigos.map((a2, i) => (
                    <option key={`web:${i}`} value={`web:${i}`}>
                      {a2.titulo}
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
                  ? atual.a2.titulo
                  : carregando
                    ? "Buscando artigos..."
                    : "Nenhum artigo encontrado"}
            </span>
          )}
          <BotaoAdicionar compacto onArquivos={(files) => void soltar(files)} />
        </div>

        {aviso && <Aviso texto={aviso} />}

        {f && (
          <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
              {f.origem === "local" ? "📁 neste aparelho" : "☁️ na nuvem"}
            </span>
            {f.origem === "local" && (
              <button
                type="button"
                onClick={async () => {
                  setAviso("");
                  try {
                    await arq.subir(f);
                  } catch (e: any) {
                    setAviso(e?.message ?? "Falha ao salvar na nuvem.");
                  }
                }}
                title="Salvar na nuvem"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                ☁️ Salvar na nuvem
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setAviso("");
                arq
                  .baixar(f)
                  .catch((e: any) =>
                    setAviso(e?.message ?? "Não foi possível baixar."),
                  );
              }}
              title="Salvar uma cópia no computador"
              className="text-blue-600 hover:underline dark:text-blue-400"
            >
              ⬇️ Baixar
            </button>
            <button
              type="button"
              onClick={() => void arq.remover(f)}
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
          <div className="min-h-0 flex-1 space-y-2 overflow-auto">
            <p className="text-sm font-semibold">{atual.a2.titulo}</p>
            {metaArtigo(atual.a2)}
            {atual.a2.resumo && (
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {atual.a2.resumo}
              </p>
            )}
            {linksArtigo(atual.a2)}
          </div>
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            {erroBusca && <span role="alert">{erroBusca} </span>}
            {carregando ? "Buscando artigos..." : "Nenhum artigo encontrado."}
          </p>
        )}
      </AreaSoltar>
    );
  }

  return (
    <AreaSoltar
      onArquivos={(files) => void soltar(files)}
      className="space-y-3"
    >
      <SeletorArquivos
        locais={arq.locais}
        nuvem={arq.nuvem}
        carregando={arq.carregando}
        acoes={arq}
        alturaLeitor="30rem"
        onAviso={setAviso}
      />

      <div className="space-y-2">
        {erroBusca && <p role="alert">{erroBusca}</p>}
        {carregando && (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Buscando artigos...
          </p>
        )}
        {!carregando && artigos.length === 0 && (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Nenhum artigo encontrado.
          </p>
        )}

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
            <div className="mt-2">{linksArtigo(a)}</div>
          </div>
        ))}
      </div>

      <Aviso texto={aviso} />
    </AreaSoltar>
  );
}
