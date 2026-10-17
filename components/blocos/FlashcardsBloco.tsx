"use client";

import { useState } from "react";

/** Bloco de flashcards: gera (IA) e exibe os cards de revisão do tópico. */
export default function FlashcardsBloco({
  topico,
  onSalvarTopico,
}: {
  topico: any;
  onSalvarTopico: (patch: Record<string, any>) => void;
}) {
  const [gerando, setGerando] = useState(false);
  const [virados, setVirados] = useState<Record<number, boolean>>({});
  const flashcards: any[] = topico?.flashcards ?? [];

  async function gerar() {
    setGerando(true);
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
      setGerando(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">🃏 Flashcards</h3>
        <button
          onClick={gerar}
          disabled={gerando}
          className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
        >
          {gerando
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
  );
}
