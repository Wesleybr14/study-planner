"use client";

import { useState } from "react";

/** Bloco de quiz: gera (IA), responde e corrige as perguntas do tópico. */
export default function QuizBloco({ topico }: { topico: any }) {
  const [quizzes, setQuizzes] = useState<any[]>([]);
  const [gerando, setGerando] = useState(false);
  const [respostas, setRespostas] = useState<Record<number, number>>({});
  const [corrigido, setCorrigido] = useState(false);

  async function gerar() {
    setGerando(true);
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
      setGerando(false);
    }
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">❓ Quiz</h3>
        <button
          onClick={gerar}
          disabled={gerando}
          className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {gerando ? "Gerando..." : quizzes.length ? "Novo quiz" : "Gerar quiz"}
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
                    onClick={() => setRespostas((p) => ({ ...p, [qi]: oi }))}
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
  );
}
