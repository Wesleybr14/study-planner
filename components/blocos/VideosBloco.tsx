"use client";

import { useEffect, useState } from "react";

/** Bloco de vídeos: busca no YouTube e reproduz embutido. */
export default function VideosBloco({
  topico,
  compacto = false,
}: {
  topico: any;
  compacto?: boolean;
}) {
  const [videos, setVideos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [sel, setSel] = useState<number | null>(null);

  useEffect(() => {
    let vivo = true;
    const q = topico?.buscaVideos ?? topico?.titulo ?? "";
    setCarregando(true);
    setSel(null);
    fetch(`/api/search-videos?q=${encodeURIComponent(q)}`)
      .then((r) => r.json())
      .then((d) => vivo && setVideos(Array.isArray(d) ? d : []))
      .catch(() => vivo && setVideos([]))
      .finally(() => vivo && setCarregando(false));
    return () => {
      vivo = false;
    };
  }, [topico?.buscaVideos, topico?.titulo]);

  if (carregando)
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500">
        Buscando vídeos...
      </p>
    );
  if (videos.length === 0)
    return (
      <p className="text-sm text-slate-400 dark:text-slate-500">
        Nenhum vídeo encontrado.
      </p>
    );

  // Modo compacto (workspace): escolhe o vídeo e mostra só ele.
  if (compacto) {
    const v = videos[sel ?? 0];
    const indice = sel ?? 0;
    return (
      <div className="flex h-full flex-col gap-2">
        {videos.length > 1 && (
          <select
            value={indice}
            onChange={(e) => setSel(Number(e.target.value))}
            className="w-full shrink-0 rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            {videos.map((vv: any, k: number) => (
              <option key={k} value={k}>
                {vv.titulo}
              </option>
            ))}
          </select>
        )}
        {v?.videoId ? (
          <iframe
            src={`https://www.youtube.com/embed/${v.videoId}`}
            title={v.titulo}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="min-h-0 w-full flex-1 rounded-lg"
          />
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Este vídeo não pode ser incorporado.
          </p>
        )}
        {v && (
          <div className="flex shrink-0 items-center justify-between gap-2 text-xs">
            <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">
              {v.canal}
            </span>
            <a
              href={v.url}
              target="_blank"
              rel="noreferrer"
              className="shrink-0 text-blue-600 hover:underline dark:text-blue-400"
            >
              Abrir no YouTube ↗
            </a>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {videos.map((v: any, k: number) =>
        v.videoId ? (
          <div
            key={k}
            className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
          >
            {sel === k ? (
              <iframe
                src={`https://www.youtube.com/embed/${v.videoId}`}
                title={v.titulo}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="aspect-video w-full"
              />
            ) : (
              <button
                onClick={() => setSel(k)}
                className="flex w-full gap-3 p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                {v.thumbnail && (
                  <img
                    src={v.thumbnail}
                    alt=""
                    className="h-14 w-24 shrink-0 rounded object-cover"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium">{v.titulo}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {v.canal}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-blue-600 dark:text-blue-400">
                    ▶ Assistir aqui
                  </p>
                </div>
              </button>
            )}
            {sel === k && (
              <div className="flex items-center justify-between gap-2 p-2">
                <p className="min-w-0 truncate text-xs text-slate-500 dark:text-slate-400">
                  {v.titulo}
                </p>
                <a
                  href={v.url}
                  target="_blank"
                  rel="noreferrer"
                  className="shrink-0 text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  Abrir no YouTube ↗
                </a>
              </div>
            )}
          </div>
        ) : (
          <a
            key={k}
            href={v.url}
            target="_blank"
            rel="noreferrer"
            className="flex gap-3 rounded-lg bg-slate-50 p-2 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            {v.thumbnail && (
              <img
                src={v.thumbnail}
                alt=""
                className="h-14 w-24 shrink-0 rounded object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-medium">{v.titulo}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {v.canal}
              </p>
            </div>
          </a>
        ),
      )}
    </div>
  );
}
