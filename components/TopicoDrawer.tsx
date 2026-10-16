"use client";

import { useEffect, useState } from "react";
import Cronometro from "@/components/Cronometro";

type Aba = "videos" | "livros" | "artigos" | "notas" | "flashcards" | "quiz";

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: "videos", rotulo: "Vídeos", icone: "🎬" },
  { id: "livros", rotulo: "Livros", icone: "📖" },
  { id: "artigos", rotulo: "Artigos", icone: "🔬" },
  { id: "notas", rotulo: "Notas", icone: "📝" },
  { id: "flashcards", rotulo: "Flashcards", icone: "🃏" },
  { id: "quiz", rotulo: "Quiz", icone: "❓" },
];

const ROTULO_ACESSO: Record<string, string> = {
  pdf: "📥 PDF grátis",
  online: "🔓 Ler online",
  emprestimo: "📚 Empréstimo grátis",
  pago: "🔒 Pago",
};

const NOME_FONTE: Record<string, string> = {
  arxiv: "arXiv",
  epmc: "Europe PMC",
  doaj: "DOAJ",
};

function estiloAcesso(acesso: string): string {
  const base = "rounded-full px-2 py-0.5 text-[10px] font-medium ";
  if (acesso === "pago")
    return (
      base + "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
    );
  return (
    base +
    "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
  );
}

// Endereço de leitura embutida de um livro, quando existir.
function embedLivro(l: any): string | null {
  if (l.ia) return `https://archive.org/embed/${l.ia}`;
  if (l.fonte === "google" && l.googleId)
    return `https://books.google.com/books?id=${l.googleId}&output=embed`;
  return null;
}

/**
 * Painel lateral (drawer) com todo o conteúdo de um tópico: vídeos, livros,
 * artigos científicos, anotações, flashcards e quiz — tudo sem sair da página.
 */
export default function TopicoDrawer({
  topico,
  indice,
  roteiroId,
  aberto,
  onFechar,
  onSalvarTopico,
}: {
  topico: any | null;
  indice: number;
  roteiroId: string;
  aberto: boolean;
  onFechar: () => void;
  onSalvarTopico: (patch: Record<string, any>) => void;
}) {
  const [aba, setAba] = useState<Aba>("videos");
  const [videos, setVideos] = useState<any[]>([]);
  const [livros, setLivros] = useState<any[]>([]);
  const [artigos, setArtigos] = useState<any[]>([]);
  const [carregando, setCarregando] = useState<Record<string, boolean>>({});
  const [soGratis, setSoGratis] = useState(false);
  const [nota, setNota] = useState("");
  const [virados, setVirados] = useState<Record<number, boolean>>({});
  const [gerandoFlash, setGerandoFlash] = useState(false);
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [gerandoQuiz, setGerandoQuiz] = useState(false);
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [corrigido, setCorrigido] = useState(false);
  const [videoSel, setVideoSel] = useState<number | null>(null);
  const [livroAberto, setLivroAberto] = useState<number | null>(null);
  const [artigoAberto, setArtigoAberto] = useState<number | null>(null);
  const [recarregar, setRecarregar] = useState(0);

  // Ao abrir outro tópico, zera o estado local.
  useEffect(() => {
    if (!aberto || !topico) return;
    setAba("videos");
    setVideos([]);
    setLivros([]);
    setArtigos([]);
    setSoGratis(false);
    setNota(topico.nota ?? "");
    setVirados({});
    setQuizzes([]);
    setRespostas({});
    setCorrigido(false);
    setVideoSel(null);
    setLivroAberto(null);
    setArtigoAberto(null);
  }, [aberto, indice]);

  async function buscar(tipo: "videos" | "livros" | "artigos", url: string) {
    setCarregando((p) => ({ ...p, [tipo]: true }));
    try {
      const r = await fetch(url).then((x) => x.json());
      const lista = Array.isArray(r) ? r : [];
      if (tipo === "videos") setVideos(lista);
      else if (tipo === "livros") setLivros(lista);
      else setArtigos(lista);
    } catch {
      if (tipo === "videos") setVideos([]);
      else if (tipo === "livros") setLivros([]);
      else setArtigos([]);
    } finally {
      setCarregando((p) => ({ ...p, [tipo]: false }));
    }
  }

  useEffect(() => {
    if (!aberto || !topico) return;
    const q = topico.buscaVideos ?? topico.titulo;
    buscar("videos", `/api/search-videos?q=${encodeURIComponent(q)}`);
  }, [aberto, indice, topico?.buscaVideos, recarregar]);

  useEffect(() => {
    if (!aberto || !topico) return;
    const q = topico.buscaLivros ?? topico.titulo;
    buscar(
      "livros",
      `/api/search-books?q=${encodeURIComponent(q)}${soGratis ? "&gratis=1" : ""}`,
    );
  }, [aberto, indice, topico?.buscaLivros, soGratis, recarregar]);

  useEffect(() => {
    if (!aberto || !topico) return;
    const q = topico.buscaArtigos ?? topico.buscaLivros ?? topico.titulo;
    buscar("artigos", `/api/search-articles?q=${encodeURIComponent(q)}`);
  }, [aberto, indice, topico?.buscaArtigos, recarregar]);

  // Esc fecha; trava o scroll do fundo enquanto aberto.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onFechar();
    }
    if (aberto) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [aberto, onFechar]);

  async function gerarFlashcards() {
    setGerandoFlash(true);
    try {
      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: topico.titulo,
          descricao: topico.descricao,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro ao gerar");
      setVirados({});
      onSalvarTopico({ flashcards: data.flashcards });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGerandoFlash(false);
    }
  }

  async function gerarQuiz() {
    setGerandoQuiz(true);
    setCorrigido(false);
    setRespostas({});
    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: topico.titulo,
          descricao: topico.descricao,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro ao gerar quiz");
      setQuizzes(data.perguntas ?? []);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGerandoQuiz(false);
    }
  }

  const flashcards: any[] = topico?.flashcards ?? [];

  return (
    <>
      <div
        onClick={onFechar}
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 ${
          aberto ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={topico?.titulo ?? "Detalhes do tópico"}
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-white shadow-2xl transition-transform duration-300 sm:w-[30rem] lg:w-[36rem] dark:border-l dark:border-slate-800 dark:bg-slate-900 ${
          aberto ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="min-w-0">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {indice >= 0 ? `Tópico ${indice + 1}` : ""}
            </p>
            <h2 className="font-semibold">{topico?.titulo}</h2>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            ✕
          </button>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 px-2 dark:border-slate-800">
          {ABAS.map((a) => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition ${
                aba === a.id
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              }`}
            >
              <span>{a.icone}</span>
              {a.rotulo}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto p-4">
          {topico && aba === "videos" && (
            <div className="space-y-3">
              {carregando.videos && (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Buscando vídeos...
                </p>
              )}
              {!carregando.videos && videos.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Nenhum vídeo encontrado.
                </p>
              )}
              {videos.map((v: any, k: number) =>
                v.videoId ? (
                  <div
                    key={k}
                    className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
                  >
                    {videoSel === k ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${v.videoId}`}
                        title={v.titulo}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="aspect-video w-full"
                      />
                    ) : (
                      <button
                        onClick={() => setVideoSel(k)}
                        className="flex w-full gap-3 p-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        {v.thumbnail && (
                          <img
                            src={v.thumbnail}
                            alt=""
                            className="h-16 w-28 rounded object-cover"
                          />
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{v.titulo}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {v.canal}
                          </p>
                          <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                            ▶ Assistir aqui
                          </p>
                        </div>
                      </button>
                    )}
                    {videoSel === k && (
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
                        className="h-16 w-28 rounded object-cover"
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
          )}

          {topico && aba === "livros" && (
            <div className="space-y-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <input
                  type="checkbox"
                  checked={soGratis}
                  onChange={(e) => setSoGratis(e.target.checked)}
                  className="h-3.5 w-3.5 accent-green-500"
                />
                Só gratuitos
              </label>

              {carregando.livros && (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Buscando livros...
                </p>
              )}
              {!carregando.livros && livros.length === 0 && (
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
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.display = "none";
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
                            onClick={() =>
                              setLivroAberto(livroAberto === k ? null : k)
                            }
                            className="mt-2 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
                          >
                            {livroAberto === k
                              ? "Fechar leitura"
                              : "📖 Ler aqui"}
                          </button>
                        )}
                      </div>
                    </div>
                    {embed && livroAberto === k && (
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
          )}

          {topico && aba === "artigos" && (
            <div className="space-y-3">
              {carregando.artigos && (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Buscando artigos...
                </p>
              )}
              {!carregando.artigos && artigos.length === 0 && (
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
                          artigoAberto === k ? "" : "line-clamp-3"
                        }`}
                      >
                        {a.resumo}
                      </p>
                      <button
                        onClick={() =>
                          setArtigoAberto(artigoAberto === k ? null : k)
                        }
                        className="mt-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {artigoAberto === k ? "Mostrar menos" : "Ler resumo"}
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
          )}

          {topico && aba === "notas" && (
            <div className="space-y-4">
              <Cronometro roteiroId={roteiroId} topicoIndex={indice} />
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">📝 Minhas anotações</h3>
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    salvo automaticamente
                  </span>
                </div>
                <textarea
                  value={nota}
                  onChange={(e) => setNota(e.target.value)}
                  onBlur={() => onSalvarTopico({ nota })}
                  rows={10}
                  placeholder="Escreva aqui o que aprendeu, dúvidas, links..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </div>
            </div>
          )}

          {topico && aba === "flashcards" && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  🃏 Flashcards de revisão
                </h3>
                <button
                  onClick={gerarFlashcards}
                  disabled={gerandoFlash}
                  className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {gerandoFlash
                    ? "Gerando..."
                    : flashcards.length
                      ? "Gerar novamente"
                      : "Gerar flashcards"}
                </button>
              </div>
              <div className="grid gap-2">
                {flashcards.length === 0 && (
                  <p className="text-sm text-slate-400 dark:text-slate-500">
                    Nenhum flashcard ainda. Clique em “Gerar flashcards”.
                  </p>
                )}
                {flashcards.map((f: any, k: number) => (
                  <button
                    key={k}
                    onClick={() => setVirados((p) => ({ ...p, [k]: !p[k] }))}
                    className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-left text-sm hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-900/40 dark:hover:bg-purple-900/60"
                  >
                    <p className="font-medium">{f.frente}</p>
                    <p
                      className={`mt-1 ${
                        virados[k]
                          ? "text-purple-700 dark:text-purple-300"
                          : "text-slate-400 dark:text-slate-500"
                      }`}
                    >
                      {virados[k] ? f.verso : "▶ Clique para ver a resposta"}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {topico && aba === "quiz" && (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">❓ Quiz</h3>
                <button
                  onClick={gerarQuiz}
                  disabled={gerandoQuiz}
                  className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {gerandoQuiz
                    ? "Gerando..."
                    : quizzes.length
                      ? "Novo quiz"
                      : "Gerar quiz"}
                </button>
              </div>

              {quizzes.length === 0 && (
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  Nenhum quiz ainda. Clique em “Gerar quiz”.
                </p>
              )}

              {quizzes.map((q: any, qi: number) => {
                const resp = respostas[qi];
                const acertou = corrigido && resp === q.correta;
                return (
                  <div
                    key={qi}
                    className="mb-2 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700"
                  >
                    <p className="mb-2 font-medium">
                      {qi + 1}. {q.pergunta}
                    </p>
                    <div className="space-y-1">
                      {q.opcoes.map((op: string, oi: number) => {
                        let cor =
                          "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800";
                        if (corrigido && oi === q.correta)
                          cor =
                            "border-green-400 bg-green-50 dark:bg-green-900/30 dark:border-green-700";
                        else if (corrigido && oi === resp && oi !== q.correta)
                          cor =
                            "border-red-400 bg-red-50 dark:bg-red-900/30 dark:border-red-700";
                        return (
                          <button
                            key={oi}
                            disabled={corrigido}
                            onClick={() =>
                              setRespostas((p) => ({ ...p, [qi]: oi }))
                            }
                            className={`flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-left ${cor} ${
                              resp === oi && !corrigido
                                ? "border-blue-500 dark:border-blue-500"
                                : ""
                            }`}
                          >
                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                              {String.fromCharCode(65 + oi)}
                            </span>
                            {op}
                          </button>
                        );
                      })}
                    </div>
                    {corrigido && (
                      <p
                        className={`mt-2 text-xs ${
                          acertou
                            ? "text-green-600 dark:text-green-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        {acertou ? "✅ Correto! " : "❌ Incorreto. "}
                        {q.explicacao}
                      </p>
                    )}
                  </div>
                );
              })}

              {quizzes.length > 0 && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setCorrigido(true)}
                    disabled={corrigido}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
                  >
                    Corrigir
                  </button>
                  {corrigido && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      Acertos:{" "}
                      {
                        quizzes.filter(
                          (q: any, qi: number) => respostas[qi] === q.correta,
                        ).length
                      }
                      /{quizzes.length}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Rodapé: recarrega os recursos (útil após atualizar as buscas). */}
        <footer className="border-t border-slate-200 px-4 py-2 dark:border-slate-800">
          <button
            onClick={() => setRecarregar((n) => n + 1)}
            className="text-xs text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
          >
            🔄 Recarregar recursos deste tópico
          </button>
        </footer>
      </aside>
    </>
  );
}
