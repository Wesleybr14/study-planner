"use client";
import { atualizarRoteiro, type SnapshotRoteiro } from "@/lib/roteiros";
import { apiFetch } from "@/lib/api-client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  identificarTopicos,
  progresso as calcularProgresso,
  type Topico,
} from "@/lib/models";
import { mensagemDe } from "@/lib/erro";
import { supabase } from "@/lib/supabase";
import { labelPrazo, corPrazo, formatarData } from "@/lib/prazo";
import {
  calcularCronograma,
  formatarDataCurta,
  type Planejamento,
} from "@/lib/cronograma";
import PlanejamentoEditor from "@/components/PlanejamentoEditor";
import AppShell from "@/components/AppShell";
import SalaEstudo from "@/components/SalaEstudo";
import WorkspaceBlocos from "@/components/WorkspaceBlocos";
import { carregarArranjos, topicKey, type Arranjos } from "@/lib/layout";

type Roteiro = {
  id: string;
  tema: string;
  descricao: string;
  topicos: Topico[];
  progresso?: number;
  prazo?: string | null;
  planejamento?: Planejamento;
  tags?: string[];
  versao?: number;
  [campo: string]: unknown;
};

export default function TemaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);
  const fila = useRef(Promise.resolve());
  const persistido = useRef<SnapshotRoteiro | null>(null);
  const roteiroRef = useRef<Roteiro | null>(null);
  const [roteiro, setRoteiro] = useState<Roteiro | null>(null);
  const [concluidos, setConcluidos] = useState<boolean[]>([]);
  const [aberto, setAberto] = useState<number | null>(null);
  const [expandido, setExpandido] = useState(false);
  const [verCronograma, setVerCronograma] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [arranjos, setArranjos] = useState<Arranjos | null>(null);

  useEffect(() => {
    if (aberto !== null && roteiro?.topicos[aberto]?.id)
      try {
        localStorage.setItem(`ultimo-topico:${id}`, roteiro.topicos[aberto].id);
      } catch {}
  }, [aberto, id, roteiro]);

  // Arranjos do workspace (para sinalizar quais tópicos têm arranjo próprio).
  useEffect(() => {
    let vivo = true;
    carregarArranjos().then((a) => vivo && setArranjos(a));
    return () => {
      vivo = false;
    };
  }, [id]);

  /** Tópico com arranjo próprio (editou à mão ou aplicou um arranjo só pra ele). */
  function temArranjoProprio(i: number): boolean {
    return !!arranjos?.trabalho[
      topicKey(id, roteiro?.topicos[i]?.recursoIndex ?? i)
    ];
  }

  // Ao fechar o workspace, recarrega os arranjos para atualizar os marcadores.
  const workspaceAberto = useRef(false);
  useEffect(() => {
    if (expandido) {
      workspaceAberto.current = true;
      return;
    }
    if (workspaceAberto.current) {
      workspaceAberto.current = false;
      carregarArranjos().then(setArranjos);
    }
  }, [expandido]);

  /** Nome do arranjo escolhido para o tópico, quando houver. */
  function nomeArranjo(i: number): string | null {
    if (!arranjos) return null;
    const k = topicKey(id, roteiro?.topicos[i]?.recursoIndex ?? i);
    const esc = arranjos.escolha[k];
    if (!esc || esc === "custom") return null;
    if (esc.startsWith("preset:")) return esc.slice("preset:".length);
    return arranjos.salvos.find((s) => s.id === esc)?.nome ?? null;
  }

  // As ações só existem com o roteiro na tela, mas o ref começa vazio.
  function atual(): Roteiro {
    if (!roteiroRef.current) throw new Error("Roteiro ainda não carregado.");
    return roteiroRef.current;
  }

  async function carregarArranjosDoUsuario() {
    setArranjos(await carregarArranjos());
  }

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from("roteiros")
      .select("*")
      .eq("id", id)
      .single();
    if (error || !data) {
      setErro(error?.message ?? "Roteiro não encontrado.");
      return;
    }
    const original: SnapshotRoteiro = { ...data };
    persistido.current = original;
    const originais = data.topicos;
    data.topicos = identificarTopicos(data.topicos);
    if (JSON.stringify(originais) !== JSON.stringify(data.topicos)) {
      try {
        persistido.current = await atualizarRoteiro(
          supabase,
          id,
          { topicos: data.topicos },
          original,
        );
        data.versao = persistido.current.versao;
      } catch {
        setErro(
          "O roteiro foi aberto, mas não foi possível sincronizar os tópicos. Suas próximas alterações poderão ser salvas novamente.",
        );
      }
    }
    roteiroRef.current = data;
    setRoteiro(data);
    try {
      localStorage.setItem(
        "ultimo-estudo",
        JSON.stringify({ id, tema: data.tema }),
      );
      const query = new URLSearchParams(window.location.search);
      const solicitado = query.has("topico")
        ? Number(query.get("topico"))
        : data.topicos.findIndex(
            (t: Topico) => t.id === localStorage.getItem(`ultimo-topico:${id}`),
          );
      if (
        Number.isInteger(solicitado) &&
        solicitado >= 0 &&
        solicitado < data.topicos.length
      )
        setAberto(solicitado);
      else if (data.topicos.length) setAberto(0);
    } catch {}
    setConcluidos(data.topicos.map((t: Topico) => !!t.concluido));
  }, [id, setAberto]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function gravar(patch: Record<string, unknown>) {
    const tarefa = fila.current
      .catch(() => {})
      .then(async () => {
        if (!persistido.current)
          throw new Error("Roteiro ainda não carregado.");
        persistido.current = await atualizarRoteiro(
          supabase,
          id,
          patch,
          persistido.current,
        );
      });
    fila.current = tarefa;
    return tarefa;
  }

  async function salvarTopicos(topicos: Topico[]) {
    const anterior = atual();
    const novo = {
      ...anterior,
      topicos,
      progresso: calcularProgresso(topicos),
    };
    roteiroRef.current = novo;
    setRoteiro(novo);
    setConcluidos(topicos.map((t) => !!t.concluido));
    setSalvando(true);
    setErro("");
    const tarefa = gravar({ topicos, progresso: novo.progresso });
    try {
      await tarefa;
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Falha ao salvar. Tente novamente.",
      );
      throw error;
    } finally {
      setSalvando(false);
    }
  }

  async function alternar(i: number) {
    try {
      await salvarTopicos(
        atual().topicos.map((t, idx) =>
          idx === i ? { ...t, concluido: !t.concluido } : t,
        ),
      );
    } catch {}
  }

  // Aplica alterações em um único tópico (usado pelo drawer).
  async function salvarTopico(patch: Partial<Topico>) {
    if (aberto === null) return;

    if (patch._duplicarApos) {
      const copia = {
        ...(patch._copia as Topico),
        id: crypto.randomUUID(),
        recursoIndex:
          Math.max(...atual().topicos.map((t) => t.recursoIndex)) + 1,
        concluido: false,
      };
      const idx = aberto;
      const topicos = [...atual().topicos];
      topicos.splice(idx + 1, 0, copia);
      await salvarTopicos(topicos);
      setAberto(idx + 1);
      setExpandido(false);
      return;
    }

    const topicos = atual().topicos.map((t, idx) =>
      idx === aberto ? { ...t, ...patch } : t,
    );
    await salvarTopicos(topicos);
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
      const titulos = atual().topicos.map((t) => t.titulo);
      const res = await apiFetch("/api/refresh-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulos }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro ao atualizar buscas");

      const topicos = atual().topicos.map((t, i) => ({
        ...t,
        buscaVideos: data.buscas[i]?.buscaVideos ?? t.buscaVideos,
        buscaLivros: data.buscas[i]?.buscaLivros ?? t.buscaLivros,
        buscaArtigos: data.buscas[i]?.buscaArtigos ?? t.buscaArtigos,
      }));
      await salvarTopicos(topicos);
    } catch (e) {
      alert(mensagemDe(e, "Erro ao atualizar buscas"));
    } finally {
      setAtualizando(false);
    }
  }

  async function mover(origem: number, destino: number) {
    const anteriores = atual().topicos;
    if (destino < 0 || destino >= anteriores.length) return;
    const topicos = [...anteriores];
    const [item] = topicos.splice(origem, 1);
    topicos.splice(destino, 0, item);
    const selecionado = aberto !== null ? anteriores[aberto]?.id : null;
    if (selecionado) setAberto(topicos.findIndex((t) => t.id === selecionado));
    await salvarTopicos(topicos);
  }

  async function salvarTags(tags: string[]) {
    setRoteiro((r) => r && { ...r, tags });
    try {
      await gravar({ tags });
      roteiroRef.current = { ...atual(), tags };
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha ao salvar tags.");
    }
  }

  function adicionarTag() {
    const tag = window.prompt("Nova tag (sem #):")?.trim().replace(/^#/, "");
    if (!tag) return;
    const tags = roteiro?.tags ?? [];
    if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return;
    salvarTags([...tags, tag]);
  }

  function removerTag(tag: string) {
    salvarTags((roteiro?.tags ?? []).filter((t) => t !== tag));
  }

  if (!roteiro) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div>
          <p role={erro ? "alert" : "status"}>{erro || "Carregando..."}</p>
          {erro && (
            <div className="mt-4 flex gap-4">
              <button
                onClick={() => {
                  setErro("");
                  carregar();
                }}
              >
                Tentar novamente
              </button>
              <button onClick={() => router.push("/dashboard")}>
                Voltar aos estudos
              </button>
            </div>
          )}
        </div>
      </main>
    );
  }

  const progresso = Math.round(
    (concluidos.filter(Boolean).length / concluidos.length) * 100,
  );
  const cron = calcularCronograma(roteiro);

  return (
    <AppShell largura="total">
      <PlanejamentoEditor
        prazo={roteiro.prazo}
        planejamento={roteiro.planejamento}
        salvar={async (patch) => {
          await gravar(patch);
          roteiroRef.current = { ...atual(), ...patch };
          setRoteiro(roteiroRef.current);
        }}
      />
      <p role={erro ? "alert" : "status"} className="mb-2 text-sm">
        {erro || (salvando ? "Salvando…" : "")}
        {erro && (
          <button
            onClick={() => salvarTopicos(atual().topicos).catch(() => {})}
          >
            Tentar salvar novamente
          </button>
        )}
      </p>

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
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {(roteiro.tags ?? []).map((t) => (
            <span
              key={t}
              className="group inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              #{t}
              <button
                onClick={() => removerTag(t)}
                title="Remover tag"
                className="text-slate-400 hover:text-red-500"
              >
                ✕
              </button>
            </span>
          ))}
          <button
            onClick={adicionarTag}
            className="rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 dark:border-slate-700 dark:text-slate-400"
          >
            ＋ tag
          </button>
        </div>
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
          {roteiro.topicos.map((t, i) => (
            <div
              key={t.id}
              className={`rounded-xl bg-white shadow transition dark:border dark:bg-slate-900 ${
                aberto === i
                  ? "ring-2 ring-blue-500 dark:border-blue-500"
                  : "dark:border-slate-800"
              }`}
            >
              <div className="flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  aria-label={`Concluir ${t.titulo}`}
                  checked={concluidos[i]}
                  onChange={() => alternar(i)}
                  className="mt-1 h-5 w-5 cursor-pointer accent-green-500"
                />
                <div
                  role="button"
                  tabIndex={0}
                  aria-label={`Abrir ${t.titulo}`}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandido(false);
                      setAberto(i);
                    }
                  }}
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
                    {temArranjoProprio(i) && (
                      <span
                        title={`Arranjo do workspace: ${
                          nomeArranjo(i) ?? "personalizado"
                        }`}
                        className="ml-1 inline-block rounded-full bg-violet-100 px-1.5 py-px text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
                      >
                        🧩 {nomeArranjo(i) ?? "arranjo próprio"}
                      </span>
                    )}
                    <span className="ml-1 text-blue-500 dark:text-blue-400">
                      · abrir →
                    </span>
                  </p>
                </div>
                <div className="flex flex-col gap-1 self-center">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      mover(i, i - 1).catch(() => {});
                    }}
                    disabled={i === 0}
                    title="Mover para cima"
                    className="rounded px-1.5 py-0.5 text-xs hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      mover(i, i + 1).catch(() => {});
                    }}
                    disabled={i === roteiro.topicos.length - 1}
                    title="Mover para baixo"
                    className="rounded px-1.5 py-0.5 text-xs hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                  >
                    ↓
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!expandido && aberto !== null && (
        <SalaEstudo
          roteiro={roteiro}
          indice={aberto}
          onSelecionar={setAberto}
          onFechar={() => setAberto(null)}
          onAvancado={() => setExpandido(true)}
          onSalvarTopico={salvarTopico}
          erro={erro}
          salvando={salvando}
        />
      )}
      {expandido && aberto !== null && (
        <WorkspaceBlocos
          topico={roteiro.topicos[aberto]}
          indice={roteiro.topicos[aberto].recursoIndex}
          roteiroId={id}
          onFechar={() => setExpandido(false)}
          onSalvarTopico={salvarTopico}
        />
      )}
    </AppShell>
  );
}
