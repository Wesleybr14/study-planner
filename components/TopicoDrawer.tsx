"use client";

import { useEffect, useState } from "react";
import VideosBloco from "@/components/blocos/VideosBloco";
import LivrosBloco from "@/components/blocos/LivrosBloco";
import ArtigosBloco from "@/components/blocos/ArtigosBloco";
import NotasBloco from "@/components/blocos/NotasBloco";
import FlashcardsBloco from "@/components/blocos/FlashcardsBloco";
import QuizBloco from "@/components/blocos/QuizBloco";

type Aba = "videos" | "livros" | "artigos" | "notas" | "flashcards" | "quiz";

const ABAS: { id: Aba; rotulo: string; icone: string }[] = [
  { id: "videos", rotulo: "Vídeos", icone: "🎬" },
  { id: "livros", rotulo: "Livros", icone: "📖" },
  { id: "artigos", rotulo: "Artigos", icone: "🔬" },
  { id: "notas", rotulo: "Notas", icone: "📝" },
  { id: "flashcards", rotulo: "Flashcards", icone: "🃏" },
  { id: "quiz", rotulo: "Quiz", icone: "❓" },
];

/**
 * Painel lateral (drawer) com o conteúdo de um tópico em abas. Cada aba é um
 * bloco reutilizável (o mesmo usado no workspace em blocos). O botão "Expandir"
 * abre o workspace onde os blocos podem ser organizados livremente.
 */
export default function TopicoDrawer({
  topico,
  indice,
  roteiroId,
  aberto,
  onFechar,
  onSalvarTopico,
  onExpandir,
}: {
  topico: any | null;
  indice: number;
  roteiroId: string;
  aberto: boolean;
  onFechar: () => void;
  onSalvarTopico: (patch: Record<string, any>) => void;
  onExpandir: () => void;
}) {
  const [aba, setAba] = useState<Aba>("videos");
  const [recarregar, setRecarregar] = useState(0);

  // Ao abrir outro tópico, volta para a primeira aba.
  useEffect(() => {
    if (aberto) setAba("videos");
  }, [aberto, indice]);

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

  const painel = (id: Aba, conteudo: React.ReactNode) => (
    <div className={aba === id ? "" : "hidden"}>{conteudo}</div>
  );

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
            <h2 className="truncate font-semibold">{topico?.titulo}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              onClick={onExpandir}
              title="Abrir no workspace em blocos"
              className="rounded-lg px-2 py-1.5 text-sm text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ⛶ Expandir
            </button>
            <button
              onClick={onFechar}
              aria-label="Fechar"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ✕
            </button>
          </div>
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

        {topico && (
          <div
            className="flex-1 overflow-y-auto p-4"
            key={`${indice}-${recarregar}`}
          >
            {painel("videos", <VideosBloco topico={topico} />)}
            {painel("livros", <LivrosBloco topico={topico} />)}
            {painel("artigos", <ArtigosBloco topico={topico} />)}
            {painel(
              "notas",
              <NotasBloco
                key={indice}
                topico={topico}
                indice={indice}
                roteiroId={roteiroId}
                onSalvarTopico={onSalvarTopico}
              />,
            )}
            {painel(
              "flashcards",
              <FlashcardsBloco
                topico={topico}
                onSalvarTopico={onSalvarTopico}
              />,
            )}
            {painel("quiz", <QuizBloco topico={topico} />)}
          </div>
        )}

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
