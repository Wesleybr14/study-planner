"use client";

import { useEffect, useRef, useState } from "react";
import { formatoDe, type Arquivo } from "@/lib/arquivos";

/**
 * Abre um arquivo do usuário (PDF ou EPUB) embutido.
 * - PDF: visualizador nativo do navegador (iframe com URL de objeto).
 * - EPUB: renderizado com epub.js (carregado sob demanda).
 */
export default function LeitorArquivo({
  arquivo,
  obterBlob,
  className = "",
}: {
  arquivo: Arquivo;
  obterBlob: (a: Arquivo) => Promise<Blob>;
  className?: string;
}) {
  const formato = formatoDe(arquivo.nome, arquivo.mime);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let vivo = true;
    setBlob(null);
    setErro("");
    obterBlob(arquivo)
      .then((b) => vivo && setBlob(b))
      .catch(
        () =>
          vivo && setErro("Não foi possível abrir o arquivo do computador."),
      );
    return () => {
      vivo = false;
    };
  }, [arquivo, obterBlob]);

  if (erro)
    return <p className="p-3 text-sm text-red-600 dark:text-red-400">{erro}</p>;

  if (!blob)
    return (
      <p className="p-3 text-sm text-slate-400 dark:text-slate-500">
        Abrindo {arquivo.nome}…
      </p>
    );

  if (formato === "epub")
    return <LeitorEpub arquivo={arquivo} blob={blob} className={className} />;

  return (
    <LeitorPdf
      arquivo={arquivo}
      blob={blob}
      aviso={
        formato === "outro"
          ? "Este formato não abre embutido — use “abrir em nova aba”."
          : undefined
      }
      className={className}
    />
  );
}

/** Cabeçalho fino com nome do arquivo e link para abrir em nova aba. */
function Barra({
  arquivo,
  url,
  extra,
}: {
  arquivo: Arquivo;
  url?: string;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-800/60">
      <span className="min-w-0 flex-1 truncate" title={arquivo.nome}>
        📄 {arquivo.nome}
      </span>
      {extra}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          title="Abrir em nova aba"
          className="shrink-0 text-blue-600 hover:underline dark:text-blue-400"
        >
          ↗
        </a>
      )}
    </div>
  );
}

function LeitorPdf({
  arquivo,
  blob,
  aviso,
  className = "",
}: {
  arquivo: Arquivo;
  blob: Blob;
  aviso?: string;
  className?: string;
}) {
  const [url, setUrl] = useState("");

  useEffect(() => {
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  if (!url)
    return (
      <p className="p-3 text-sm text-slate-400 dark:text-slate-500">
        Abrindo {arquivo.nome}…
      </p>
    );

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      <Barra arquivo={arquivo} url={url} />
      {aviso ? (
        <p className="p-3 text-sm text-slate-500 dark:text-slate-400">
          {aviso}
        </p>
      ) : (
        <iframe
          src={url}
          title={arquivo.nome}
          className="min-h-0 w-full flex-1 border-0 bg-white"
        />
      )}
    </div>
  );
}

function LeitorEpub({
  arquivo,
  blob,
  className = "",
}: {
  arquivo: Arquivo;
  blob: Blob;
  className?: string;
}) {
  const alvo = useRef<HTMLDivElement>(null);
  const rend = useRef<any>(null);
  const livro = useRef<any>(null);
  const [pronto, setPronto] = useState(false);
  const [erro, setErro] = useState("");
  const [pct, setPct] = useState(0);
  const [fonte, setFonte] = useState(100);

  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const mod: any = await import("epubjs");
        const ePub = mod.default ?? mod;
        const buffer = await blob.arrayBuffer();
        const b = ePub(buffer);
        const r = b.renderTo(alvo.current, {
          width: "100%",
          height: "100%",
          spread: "none",
        });
        livro.current = b;
        rend.current = r;
        let posicao: string | undefined;
        try {
          posicao =
            localStorage.getItem(`leitura-epub:${arquivo.id}`) ?? undefined;
        } catch {}
        try {
          await r.display(posicao);
        } catch {
          await r.display();
        }
        if (!vivo) return;
        setPronto(true);

        r.on("relocated", (loc: any) => {
          if (!vivo) return;
          try {
            if (loc?.start?.cfi)
              localStorage.setItem(`leitura-epub:${arquivo.id}`, loc.start.cfi);
          } catch {}
          const total = b.locations?.length?.() ?? 0;
          const atual = b.locations?.locationFromCfi?.(loc?.start?.cfi) ?? 0;
          if (total) setPct(Math.round((atual / total) * 100));
        });
        b.locations.generate(1000).catch(() => {});
      } catch {
        if (vivo) setErro("Não foi possível abrir o EPUB.");
      }
    })();
    return () => {
      vivo = false;
      try {
        rend.current?.destroy();
      } catch {}
      try {
        livro.current?.destroy();
      } catch {}
      rend.current = null;
      livro.current = null;
    };
  }, [blob, arquivo.id]);

  useEffect(() => {
    if (pronto) rend.current?.themes?.fontSize?.(`${fonte}%`);
  }, [fonte, pronto]);

  const btn =
    "rounded px-1.5 py-0.5 hover:bg-slate-200 disabled:opacity-40 dark:hover:bg-slate-700";

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      <div className="flex shrink-0 items-center gap-1 border-b border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-800 dark:bg-slate-800/60">
        <span className="min-w-0 flex-1 truncate" title={arquivo.nome}>
          📖 {arquivo.nome}
        </span>
        <button
          type="button"
          onClick={() => rend.current?.prev()}
          disabled={!pronto}
          title="Anterior"
          className={btn}
        >
          ‹
        </button>
        <span className="tabular-nums text-slate-400 dark:text-slate-500">
          {pct}%
        </span>
        <button
          type="button"
          onClick={() => rend.current?.next()}
          disabled={!pronto}
          title="Próximo"
          className={btn}
        >
          ›
        </button>
        <button
          type="button"
          onClick={() => setFonte((f) => Math.max(70, f - 10))}
          disabled={!pronto}
          title="Diminuir letra"
          className={btn}
        >
          A−
        </button>
        <button
          type="button"
          onClick={() => setFonte((f) => Math.min(220, f + 10))}
          disabled={!pronto}
          title="Aumentar letra"
          className={btn}
        >
          A+
        </button>
      </div>

      {erro ? (
        <p className="p-3 text-sm text-red-600 dark:text-red-400">{erro}</p>
      ) : (
        <div className="relative min-h-0 flex-1 bg-white dark:bg-slate-900">
          {!pronto && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-400 dark:text-slate-500">
              Abrindo EPUB…
            </p>
          )}
          <div ref={alvo} className="h-full w-full" />
        </div>
      )}
    </div>
  );
}
