"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { labelPrazo, corPrazo, formatarData } from "@/lib/prazo";
import { calcularCronograma, formatarDataCurta } from "@/lib/cronograma";
import AppShell from "@/components/AppShell";
import Cronometro from "@/components/Cronometro";

type Flashcard = { frente: string; verso: string };

type Topico = {
  titulo: string;
  nivel: string;
  descricao: string;
  duracaoEstimada: string;
  buscaVideos: string;
  buscaLivros: string;
  nota?: string;
  flashcards?: Flashcard[];
};

const ROTULO_ACESSO: Record<string, string> = {
  pdf: "📥 PDF grátis",
  online: "🔓 Ler online",
  emprestimo: "📚 Empréstimo grátis",
  pago: "🔒 Pago",
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

export default function TemaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [roteiro, setRoteiro] = useState<any>(null);
  const [concluidos, setConcluidos] = useState<boolean[]>([]);
  const [aberto, setAberto] = useState<number | null>(null);
  const [videos, setVideos] = useState<Record<number, any[]>>({});
  const [livros, setLivros] = useState<Record<number, any[]>>({});
  const [notas, setNotas] = useState<Record<number, string>>({});
  const [gerandoFlash, setGerandoFlash] = useState<Record<number, boolean>>({});
  const [virados, setVirados] = useState<Record<string, boolean>>({});
  const [verCronograma, setVerCronograma] = useState(false);
  const [quizzes, setQuizzes] = useState<Record<number, any[]>>({});
  const [gerandoQuiz, setGerandoQuiz] = useState<Record<number, boolean>>({});
  const [respostas, setRespostas] = useState<Record<string, number>>({});
  const [corrigido, setCorrigido] = useState<Record<number, boolean>>({});
  const [soGratis, setSoGratis] = useState<Record<number, boolean>>({});
  const [carregandoLivros, setCarregandoLivros] = useState<
    Record<number, boolean>
  >({});
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
    const n: Record<number, string> = {};
    data.topicos.forEach((t: any, i: number) => (n[i] = t.nota ?? ""));
    setNotas(n);
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

  async function carregarVideos(i: number, q: string) {
    try {
      const v = await fetch(
        `/api/search-videos?q=${encodeURIComponent(q)}`,
      ).then((r) => r.json());
      setVideos((p) => ({ ...p, [i]: v }));
    } catch {
      setVideos((p) => ({ ...p, [i]: [] }));
    }
  }

  async function carregarLivros(i: number, gratis: boolean, q: string) {
    setCarregandoLivros((p) => ({ ...p, [i]: true }));
    try {
      const l = await fetch(
        `/api/search-books?q=${encodeURIComponent(q)}${gratis ? "&gratis=1" : ""}`,
      ).then((r) => r.json());
      setLivros((p) => ({ ...p, [i]: l }));
    } catch {
      setLivros((p) => ({ ...p, [i]: [] }));
    } finally {
      setCarregandoLivros((p) => ({ ...p, [i]: false }));
    }
  }

  async function abrir(i: number) {
    if (aberto === i) {
      setAberto(null);
      return;
    }
    setAberto(i);

    const t = roteiro.topicos[i];
    if (!videos[i]) carregarVideos(i, t.buscaVideos ?? t.titulo);
    if (!livros[i]) carregarLivros(i, !!soGratis[i], t.buscaLivros ?? t.titulo);
  }

  // Regenera os termos de busca (vídeos e livros) usando IA — útil para
  // roteiros antigos criados com termos que traziam poucos resultados livres.
  async function atualizarBuscas() {
    if (
      !confirm(
        "Atualizar os termos de busca de vídeos e livros deste roteiro? Isso usa IA e pode levar alguns segundos.",
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
      }));
      await salvarTopicos(topicos);

      // Limpa os caches e recarrega o tópico aberto com os novos termos.
      setVideos({});
      setLivros({});
      if (aberto !== null) {
        carregarVideos(
          aberto,
          topicos[aberto].buscaVideos ?? topicos[aberto].titulo,
        );
        carregarLivros(
          aberto,
          !!soGratis[aberto],
          topicos[aberto].buscaLivros ?? topicos[aberto].titulo,
        );
      }
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAtualizando(false);
    }
  }

  async function salvarNota(i: number) {
    const topicos = roteiro.topicos.map((t: any, idx: number) =>
      idx === i ? { ...t, nota: notas[i] ?? "" } : t,
    );
    await salvarTopicos(topicos);
  }

  async function gerarFlashcards(i: number) {
    setGerandoFlash((p) => ({ ...p, [i]: true }));
    try {
      const t = roteiro.topicos[i];
      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: t.titulo, descricao: t.descricao }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro ao gerar");
      const topicos = roteiro.topicos.map((tp: any, idx: number) =>
        idx === i ? { ...tp, flashcards: data.flashcards } : tp,
      );
      await salvarTopicos(topicos);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGerandoFlash((p) => ({ ...p, [i]: false }));
    }
  }

  async function gerarQuiz(i: number) {
    setGerandoQuiz((p) => ({ ...p, [i]: true }));
    setCorrigido((p) => ({ ...p, [i]: false }));
    try {
      const t = roteiro.topicos[i];
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: t.titulo, descricao: t.descricao }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro ao gerar quiz");
      setQuizzes((p) => ({ ...p, [i]: data.perguntas }));
      setRespostas((p) => {
        const n = { ...p };
        (data.perguntas ?? []).forEach(
          (_: any, qi: number) => delete n[`${i}-${qi}`],
        );
        return n;
      });
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGerandoQuiz((p) => ({ ...p, [i]: false }));
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
              title="Regera os termos de busca de vídeos e livros deste roteiro"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {atualizando ? "Atualizando buscas..." : "🔄 Atualizar buscas"}
            </button>
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              Regera os termos de busca de vídeos e livros. Útil para roteiros
              antigos.
            </p>
          </div>
        </aside>

        {/* Coluna principal: tópicos */}
        <div className="space-y-3 lg:col-span-2 lg:order-1">
          {roteiro.topicos.map((t: Topico, i: number) => (
            <div
              key={i}
              className="rounded-xl bg-white shadow dark:border dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  checked={concluidos[i]}
                  onChange={() => alternar(i)}
                  className="mt-1 h-5 w-5 cursor-pointer accent-green-500"
                />
                <div className="flex-1 cursor-pointer" onClick={() => abrir(i)}>
                  <div className="flex items-center gap-2">
                    <span
                      className={`font-semibold ${concluidos[i] ? "text-slate-400 line-through dark:text-slate-500" : ""}`}
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
                  </p>
                </div>
              </div>

              {aberto === i && (
                <div className="space-y-4 border-t p-4 dark:border-slate-800">
                  <Cronometro roteiroId={id} topicoIndex={i} />

                  <div>
                    <h3 className="mb-2 text-sm font-semibold">🎬 Vídeos</h3>
                    <div className="grid gap-2">
                      {(videos[i] ?? []).map((v: any, k: number) => (
                        <a
                          key={k}
                          href={v.url}
                          target="_blank"
                          className="flex gap-3 rounded-lg bg-slate-50 p-2 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                        >
                          {v.thumbnail && (
                            <img
                              src={v.thumbnail}
                              alt=""
                              className="h-16 w-28 rounded object-cover"
                            />
                          )}
                          <div>
                            <p className="text-sm font-medium">{v.titulo}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {v.canal}
                            </p>
                          </div>
                        </a>
                      ))}
                      {videos[i]?.length === 0 && (
                        <p className="text-sm text-slate-400 dark:text-slate-500">
                          Nenhum vídeo encontrado.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">📖 Livros</h3>
                      <label className="flex cursor-pointer items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <input
                          type="checkbox"
                          checked={!!soGratis[i]}
                          onChange={(e) => {
                            const v = e.target.checked;
                            setSoGratis((p) => ({ ...p, [i]: v }));
                            carregarLivros(
                              i,
                              v,
                              roteiro.topicos[i].buscaLivros ??
                                roteiro.topicos[i].titulo,
                            );
                          }}
                          className="h-3.5 w-3.5 accent-green-500"
                        />
                        Só gratuitos
                      </label>
                    </div>
                    <div className="grid gap-2">
                      {carregandoLivros[i] && (
                        <p className="text-sm text-slate-400 dark:text-slate-500">
                          Buscando livros...
                        </p>
                      )}

                      {!carregandoLivros[i] &&
                        (livros[i] ?? []).map((l: any, k: number) => (
                          <div
                            key={k}
                            className="flex gap-3 rounded-lg bg-slate-50 p-2 dark:bg-slate-800"
                          >
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
                                className="h-16 w-12 shrink-0 rounded object-cover"
                              />
                            ) : (
                              <div className="flex h-16 w-12 shrink-0 items-center justify-center rounded bg-slate-200 text-xl dark:bg-slate-700">
                                📕
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <a
                                href={l.url}
                                target="_blank"
                                className="text-sm font-medium hover:underline"
                              >
                                {l.titulo}
                              </a>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
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
                                    className="text-xs font-semibold text-green-600 hover:underline dark:text-green-400"
                                  >
                                    📥 Baixar PDF
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}

                      {!carregandoLivros[i] && livros[i]?.length === 0 && (
                        <p className="text-sm text-slate-400 dark:text-slate-500">
                          Nenhum livro encontrado
                          {soGratis[i] ? " gratuito" : ""}.
                        </p>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="mb-2 text-sm font-semibold">
                      📝 Minhas anotações
                    </h3>
                    <textarea
                      value={notas[i] ?? ""}
                      onChange={(e) =>
                        setNotas((p) => ({ ...p, [i]: e.target.value }))
                      }
                      onBlur={() => salvarNota(i)}
                      rows={3}
                      placeholder="Escreva aqui o que aprendeu, dúvidas, links..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">
                        🃏 Flashcards de revisão
                      </h3>
                      <button
                        onClick={() => gerarFlashcards(i)}
                        disabled={gerandoFlash[i]}
                        className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                      >
                        {gerandoFlash[i]
                          ? "Gerando..."
                          : t.flashcards?.length
                            ? "Gerar novamente"
                            : "Gerar flashcards"}
                      </button>
                    </div>
                    <div className="grid gap-2">
                      {(t.flashcards ?? []).map((f, k) => {
                        const chave = `${i}-${k}`;
                        return (
                          <button
                            key={k}
                            onClick={() =>
                              setVirados((p) => ({ ...p, [chave]: !p[chave] }))
                            }
                            className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-left text-sm hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-900/40 dark:hover:bg-purple-900/60"
                          >
                            <p className="font-medium">{f.frente}</p>
                            <p
                              className={`mt-1 ${virados[chave] ? "text-purple-700 dark:text-purple-300" : "text-slate-400 dark:text-slate-500"}`}
                            >
                              {virados[chave]
                                ? f.verso
                                : "▶ Clique para ver a resposta"}
                            </p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <h3 className="text-sm font-semibold">❓ Quiz</h3>
                      <button
                        onClick={() => gerarQuiz(i)}
                        disabled={gerandoQuiz[i]}
                        className="rounded-lg bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {gerandoQuiz[i]
                          ? "Gerando..."
                          : quizzes[i]?.length
                            ? "Novo quiz"
                            : "Gerar quiz"}
                      </button>
                    </div>

                    {(quizzes[i] ?? []).map((q: any, qi: number) => {
                      const chave = `${i}-${qi}`;
                      const resp = respostas[chave];
                      const mostrando = corrigido[i];
                      const acertou = mostrando && resp === q.correta;
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
                              if (mostrando && oi === q.correta)
                                cor =
                                  "border-green-400 bg-green-50 dark:bg-green-900/30 dark:border-green-700";
                              else if (
                                mostrando &&
                                oi === resp &&
                                oi !== q.correta
                              )
                                cor =
                                  "border-red-400 bg-red-50 dark:bg-red-900/30 dark:border-red-700";
                              return (
                                <button
                                  key={oi}
                                  disabled={mostrando}
                                  onClick={() =>
                                    setRespostas((p) => ({ ...p, [chave]: oi }))
                                  }
                                  className={`flex w-full items-center gap-2 rounded-lg border px-3 py-1.5 text-left ${cor} ${
                                    resp === oi && !mostrando
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
                          {mostrando && (
                            <p
                              className={`mt-2 text-xs ${acertou ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                            >
                              {acertou ? "✅ Correto! " : "❌ Incorreto. "}
                              {q.explicacao}
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {quizzes[i]?.length > 0 && (
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() =>
                            setCorrigido((p) => ({ ...p, [i]: true }))
                          }
                          disabled={corrigido[i]}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50 dark:bg-slate-700 dark:hover:bg-slate-600"
                        >
                          Corrigir
                        </button>
                        {corrigido[i] && (
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            Acertos:{" "}
                            {
                              quizzes[i].filter(
                                (q: any, qi: number) =>
                                  respostas[`${i}-${qi}`] === q.correta,
                              ).length
                            }
                            /{quizzes[i].length}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
