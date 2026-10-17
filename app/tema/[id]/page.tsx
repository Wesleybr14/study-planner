"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { labelPrazo, corPrazo, formatarData } from "@/lib/prazo";
import { calcularCronograma, formatarDataCurta } from "@/lib/cronograma";
import AppShell from "@/components/AppShell";
import TopicoDrawer from "@/components/TopicoDrawer";
import WorkspaceBlocos from "@/components/WorkspaceBlocos";

type Flashcard = { frente: string; verso: string };

type Topico = {
  titulo: string;
  nivel: string;
  descricao: string;
  duracaoEstimada: string;
  buscaVideos: string;
  buscaLivros: string;
  buscaArtigos?: string;
  nota?: string;
  flashcards?: Flashcard[];
};

export default function TemaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [roteiro, setRoteiro] = useState<any>(null);
  const [concluidos, setConcluidos] = useState<boolean[]>([]);
  const [aberto, setAberto] = useState<number | null>(null);
  const [expandido, setExpandido] = useState(false);
  const [verCronograma, setVerCronograma] = useState(false);
  const [atualizando, setAtualizando] = useState(false);

  useEffect(() => {
    carregar();
  }, [id]);

  async function carregar() {
    const { data } = await supabase
      .from("roteiros")
      .select("*")
      .eq("id", id)
      .single();
    if (!data) return router.replace("/dashboard");
    setRoteiro(data);
    setConcluidos(data.topicos.map((t: any) => !!t.concluido));
  }

  async function salvarTopicos(topicos: any[]) {
    setRoteiro((r: any) => ({ ...r, topicos }));
    await supabase.from("roteiros").update({ topicos }).eq("id", id);
  }

  async function alternar(i: number) {
    const novos = [...concluidos];
    novos[i] = !novos[i];
    setConcluidos(novos);

    const topicos = roteiro.topicos.map((t: any, idx: number) => ({
      ...t,
      concluido: novos[idx],
    }));
    const progresso = Math.round(
      (novos.filter(Boolean).length / novos.length) * 100,
    );

    await supabase.from("roteiros").update({ topicos, progresso }).eq("id", id);
    setRoteiro({ ...roteiro, topicos, progresso });
  }

  // Aplica alterações em um único tópico (usado pelo drawer).
  function salvarTopico(patch: Record<string, any>) {
    if (aberto === null) return;
    const topicos = roteiro.topicos.map((t: any, idx: number) =>
      idx === aberto ? { ...t, ...patch } : t,
    );
    salvarTopicos(topicos);
  }

  // Regenera os termos de busca (vídeos, livros e artigos) usando IA — útil para
  // roteiros antigos criados com termos que traziam poucos resultados livres.
  async function atualizarBuscas() {
    if (
      !confirm(
        "Atualizar os termos de busca de vídeos, livros e artigos deste roteiro? Isso usa IA e pode levar alguns segundos.",
      )
    )
      return;

    setAtualizando(true);
    try {
      const titulos = roteiro.topicos.map((t: any) => t.titulo);
      const res = await fetch("/api/refresh-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro ao atualizar buscas");

      const topicos = roteiro.topicos.map((t: any, i: number) => ({
        ...t,
        buscaVideos: data.buscas[i]?.buscaVideos ?? t.buscaVideos,
        buscaLivros: data.buscas[i]?.buscaLivros ?? t.buscaLivros,
        buscaArtigos: data.buscas[i]?.buscaArtigos ?? t.buscaArtigos,
      }));
      await salvarTopicos(topicos);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAtualizando(false);
    }
  }

  if (!roteiro) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">Carregando...</p>
      </main>
    );
  }

  const progresso = Math.round(
    (concluidos.filter(Boolean).length / concluidos.length) * 100,
  );
  const cron = calcularCronograma(roteiro);

  return (
    <AppShell>
      <button
        onClick={() => router.push("/dashboard")}
        className="mb-4 text-sm text-blue-600 hover:underline dark:text-blue-400"
      >
        ← Voltar
      </button>

      <header className="mb-6">
        <h1 className="text-2xl font-bold">{roteiro.tema}</h1>
        <p className="text-slate-500 dark:text-slate-400">
          {roteiro.descricao}
        </p>
        {roteiro.prazo && (
          <p className={`mt-2 text-sm font-medium ${corPrazo(roteiro.prazo)}`}>
            🎯 Meta: {formatarData(roteiro.prazo)} · {labelPrazo(roteiro.prazo)}
          </p>
        )}
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Coluna lateral (aparece primeiro no celular) */}
        <aside className="space-y-4 lg:col-span-1 lg:order-2">
          <div className="rounded-xl bg-white p-4 shadow dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="mb-1 flex justify-between text-sm">
              <span className="font-medium">Progresso</span>
              <span>{progresso}%</span>
            </div>
            <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-2 rounded-full bg-green-500 transition-all"
                style={{ width: `${progresso}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {concluidos.filter(Boolean).length} de {concluidos.length} tópicos
              concluídos
            </p>
          </div>

          {cron.concluido ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300">
              🎉 Parabéns! Você concluiu todos os tópicos.
            </div>
          ) : (
            <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-900/30">
              <p className="font-semibold">📅 Hoje</p>
              {cron.hoje.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  Sem tópicos programados para hoje.
                </p>
              ) : (
                <ul className="mt-1 space-y-1">
                  {cron.hoje.map((it) => (
                    <li key={it.indice} className="text-sm">
                      📌 {it.titulo}{" "}
                      <span className="text-slate-500 dark:text-slate-400">
                        (~{it.horas}h)
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              {cron.diasRestantes !== null && (
                <p
                  className={`mt-2 text-xs ${
                    cron.atrasado
                      ? "text-red-600 dark:text-red-400"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {cron.atrasado
                    ? "⚠️ Meta atrasada — considere revisar a data."
                    : `≈ ${cron.horasPorDia}h por dia para cumprir a meta`}
                </p>
              )}

              <button
                onClick={() => setVerCronograma((v) => !v)}
                className="mt-2 text-sm text-blue-600 hover:underline dark:text-blue-400"
              >
                {verCronograma
                  ? "Ocultar cronograma"
                  : "Ver cronograma completo"}
              </button>

              {verCronograma && (
                <div className="mt-3 space-y-3 border-t pt-3 dark:border-slate-700">
                  {cron.dias.map((d, i) => (
                    <div key={i}>
                      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {i === 0 ? "Hoje" : formatarDataCurta(d.data)}
                      </p>
                      <ul className="mt-0.5 space-y-0.5">
                        {d.itens.map((it) => (
                          <li key={it.indice} className="text-sm">
                            📌 {it.titulo}{" "}
                            <span className="text-slate-500 dark:text-slate-400">
                              (~{it.horas}h)
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="rounded-xl bg-white p-4 shadow dark:border dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-2 text-sm font-semibold">Ações</h3>
            <button
              onClick={atualizarBuscas}
              disabled={atualizando}
              title="Regera os termos de busca de vídeos, livros e artigos deste roteiro"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {atualizando ? "Atualizando buscas..." : "🔄 Atualizar buscas"}
            </button>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Regera os termos de busca de vídeos, livros e artigos. Útil para
              roteiros antigos.
            </p>
          </div>
        </aside>

        {/* Coluna principal: tópicos */}
        <div className="space-y-3 lg:col-span-2 lg:order-1">
          {roteiro.topicos.map((t: Topico, i: number) => (
            <div
              key={i}
              className={`rounded-xl bg-white shadow transition dark:border dark:bg-slate-900 ${
                aberto === i
                  ? "ring-2 ring-blue-500 dark:border-blue-500"
                  : "dark:border-slate-800"
              }`}
            >
              <div className="flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  checked={concluidos[i]}
                  onChange={() => alternar(i)}
                  className="mt-1 h-5 w-5 cursor-pointer accent-green-500"
                />
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => {
                    setExpandido(false);
                    setAberto(i);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold ${
                        concluidos[i]
                          ? "text-slate-400 line-through dark:text-slate-500"
                          : ""
                      }`}
                    >
                      {i + 1}. {t.titulo}
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      {t.nivel}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t.descricao}
                  </p>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                    ⏱ {t.duracaoEstimada}
                    {t.nota ? " · 📝 com anotação" : ""}
                    {t.flashcards?.length
                      ? ` · 🃏 ${t.flashcards.length} flashcards`
                      : ""}
                    <span className="ml-1 text-blue-500 dark:text-blue-400">
                      · abrir →
                    </span>
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {(!expandido || aberto === null) && (
        <TopicoDrawer
          aberto={aberto !== null}
          onFechar={() => {
            setExpandido(false);
            setAberto(null);
          }}
          onExpandir={() => setExpandido(true)}
          topico={aberto !== null ? roteiro.topicos[aberto] : null}
          indice={aberto ?? 0}
          roteiroId={id}
          onSalvarTopico={salvarTopico}
        />
      )}

      {expandido && aberto !== null && (
        <WorkspaceBlocos
          topico={roteiro.topicos[aberto]}
          indice={aberto}
          roteiroId={id}
          onFechar={() => setExpandido(false)}
          onSalvarTopico={salvarTopico}
        />
      )}
    </AppShell>
  );
}
