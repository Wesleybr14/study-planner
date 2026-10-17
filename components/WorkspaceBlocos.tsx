"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ALTURA_LINHA,
  COLUNAS,
  ESPACO,
  PRESETS,
  TIPOS,
  TIPOS_ORDEM,
  blocosDoArranjo,
  cabe,
  carregarArranjos,
  normalizarArranjos,
  novoIdArranjo,
  presetId,
  salvarArranjos,
  topicKey,
  type Arranjos,
  type Bloco,
  type TipoBloco,
} from "@/lib/layout";
import VideosBloco from "@/components/blocos/VideosBloco";
import LivrosBloco from "@/components/blocos/LivrosBloco";
import ArtigosBloco from "@/components/blocos/ArtigosBloco";
import NotasBloco from "@/components/blocos/NotasBloco";
import FlashcardsBloco from "@/components/blocos/FlashcardsBloco";
import QuizBloco from "@/components/blocos/QuizBloco";

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

type Arrasto = {
  id: TipoBloco;
  modo: "mover" | "redimensionar";
  inicioX: number;
  inicioY: number;
  base: Bloco;
};

/**
 * Workspace em blocos (estilo "snap"): os recursos do tópico ficam em blocos
 * que podem ser movidos e redimensionados livremente, ou reorganizados por
 * arranjos prontos/salvos. O usuário pode salvar arranjos nomeados e escolher
 * qual usar em cada tópico; tudo fica salvo na nuvem.
 */
export default function WorkspaceBlocos({
  topico,
  indice,
  roteiroId,
  onFechar,
  onSalvarTopico,
}: {
  topico: any;
  indice: number;
  roteiroId: string;
  onFechar: () => void;
  onSalvarTopico: (patch: Record<string, any>) => void;
}) {
  const chave = topicKey(roteiroId, indice);

  const [arranjos, setArranjos] = useState<Arranjos | null>(null);
  const [ativo, setAtivo] = useState<TipoBloco | null>(null);
  const [preview, setPreview] = useState<Bloco | null>(null);
  const [largura, setLargura] = useState(0);
  const [ehMobile, setEhMobile] = useState(false);

  const areaRef = useRef<HTMLDivElement>(null);
  const arrasto = useRef<Arrasto | null>(null);
  const previewRef = useRef<Bloco | null>(null);
  const layoutRef = useRef<Bloco[] | null>(null);
  const primeiraCarga = useRef(true);

  // Carrega os arranjos salvos (ou usa o padrão).
  useEffect(() => {
    let vivo = true;
    carregarArranjos().then(
      (a) => vivo && setArranjos(a ?? normalizarArranjos(null)),
    );
    return () => {
      vivo = false;
    };
  }, []);

  const layout = arranjos
    ? (arranjos.trabalho[chave] ?? arranjos.padrao)
    : null;

  // Salva os arranjos (com um pequeno atraso) sempre que mudarem.
  useEffect(() => {
    if (!arranjos) return;
    if (primeiraCarga.current) {
      primeiraCarga.current = false;
      return;
    }
    const t = setTimeout(() => salvarArranjos(arranjos), 700);
    return () => clearTimeout(t);
  }, [arranjos]);

  // Detecta o celular (uma vez no mount).
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const atualiza = () => setEhMobile(mq.matches);
    atualiza();
    mq.addEventListener("change", atualiza);
    return () => mq.removeEventListener("change", atualiza);
  }, []);

  // Mede a largura da área da grade. Roda quando a grade passa a existir.
  const gradeVisivel = layout !== null && !ehMobile;
  useEffect(() => {
    if (!gradeVisivel) return;
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(e.contentRect.width));
    ro.observe(el);
    setLargura(el.clientWidth);
    return () => ro.disconnect();
  }, [gradeVisivel]);

  const colW = largura > 0 ? (largura - ESPACO * (COLUNAS - 1)) / COLUNAS : 0;
  const passoX = colW + ESPACO;
  const passoY = ALTURA_LINHA + ESPACO;

  // Mantém uma referência atual do layout (evita closures desatualizadas).
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  /** Aplica um layout ao tópico atual (edição à mão). */
  function definirLayout(blocos: Bloco[], marcaEscolha = true) {
    setArranjos((a) =>
      a
        ? {
            ...a,
            padrao: blocos,
            trabalho: { ...a.trabalho, [chave]: blocos },
            escolha: marcaEscolha
              ? { ...a.escolha, [chave]: "custom" }
              : a.escolha,
          }
        : a,
    );
  }

  // Durante o arrasto só mexemos na pré-visualização — o layout "de verdade"
  // muda apenas ao soltar, e só se a posição não sobrepuser outro bloco.
  const aoMover = useCallback(
    (e: PointerEvent) => {
      const d = arrasto.current;
      const atual = layoutRef.current;
      if (!d || !atual) return;
      const dx = Math.round((e.clientX - d.inicioX) / passoX);
      const dy = Math.round((e.clientY - d.inicioY) / passoY);
      const alvo = atual.find((b) => b.id === d.id);
      if (!alvo) return;
      const novo: Bloco =
        d.modo === "mover"
          ? {
              ...alvo,
              x: clamp(d.base.x + dx, 0, COLUNAS - alvo.w),
              y: Math.max(0, d.base.y + dy),
            }
          : {
              ...alvo,
              w: clamp(d.base.w + dx, 1, COLUNAS - alvo.x),
              h: Math.max(2, d.base.h + dy),
            };
      previewRef.current = novo;
      setPreview(novo);
    },
    [passoX, passoY],
  );

  const aoSoltar = useCallback(() => {
    const d = arrasto.current;
    const p = previewRef.current;
    const atual = layoutRef.current;
    if (d && p && atual && cabe(atual, p)) {
      const blocos = atual.map((b) => (b.id === d.id ? p : b));
      setArranjos((a) =>
        a
          ? {
              ...a,
              padrao: blocos,
              trabalho: { ...a.trabalho, [chave]: blocos },
              escolha: { ...a.escolha, [chave]: "custom" },
            }
          : a,
      );
    }
    arrasto.current = null;
    previewRef.current = null;
    setPreview(null);
    setAtivo(null);
    window.removeEventListener("pointermove", aoMover);
    window.removeEventListener("pointerup", aoSoltar);
  }, [aoMover, chave]);

  function iniciar(
    e: React.PointerEvent,
    bloco: Bloco,
    modo: "mover" | "redimensionar",
  ) {
    if (ehMobile) return;
    e.preventDefault();
    e.stopPropagation();
    arrasto.current = {
      id: bloco.id,
      modo,
      inicioX: e.clientX,
      inicioY: e.clientY,
      base: { ...bloco },
    };
    previewRef.current = null;
    setPreview(null);
    setAtivo(bloco.id);
    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
  }

  // Limpa listeners se desmontar no meio de um arrasto.
  useEffect(
    () => () => {
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
    },
    [aoMover, aoSoltar],
  );

  /** Aplica um arranjo (pronto ou salvo) ao tópico atual. */
  function aplicar(id: string) {
    if (id === "custom" || !arranjos) return;
    const blocos = blocosDoArranjo(arranjos, id);
    if (!blocos) return;
    setArranjos((a) =>
      a
        ? {
            ...a,
            trabalho: { ...a.trabalho, [chave]: blocos },
            escolha: { ...a.escolha, [chave]: id },
          }
        : a,
    );
  }

  /** Salva o arranjo atual da tópico como um arranjo nomeado. */
  function salvarArranjo() {
    if (!arranjos || !layout) return;
    const sugerido = `Arranjo ${arranjos.salvos.length + 1}`;
    const nome = prompt("Nome do arranjo:", sugerido);
    if (!nome || !nome.trim()) return;
    const novo = {
      id: novoIdArranjo(),
      nome: nome.trim(),
      blocos: layout.map((b) => ({ ...b })),
    };
    setArranjos((a) =>
      a
        ? {
            ...a,
            salvos: [...a.salvos, novo],
            escolha: { ...a.escolha, [chave]: novo.id },
          }
        : a,
    );
  }

  function excluirArranjo(id: string) {
    if (!id || id === "custom" || id.startsWith("preset:")) return;
    if (!confirm("Excluir este arranjo salvo?")) return;
    setArranjos((a) => {
      if (!a) return a;
      const escolha: Record<string, string> = {};
      for (const [k, v] of Object.entries(a.escolha))
        escolha[k] = v === id ? "custom" : v;
      return { ...a, salvos: a.salvos.filter((s) => s.id !== id), escolha };
    });
  }

  function ocultar(id: TipoBloco) {
    if (!layout) return;
    definirLayout(
      layout.map((b) => (b.id === id ? { ...b, oculto: true } : b)),
    );
  }

  function mostrar(id: TipoBloco) {
    if (!layout) return;
    definirLayout(
      layout.map((b) => (b.id === id ? { ...b, oculto: false } : b)),
    );
  }

  function conteudo(id: TipoBloco) {
    switch (id) {
      case "video":
        return <VideosBloco topico={topico} compacto />;
      case "livro":
        return <LivrosBloco topico={topico} compacto />;
      case "artigos":
        return <ArtigosBloco topico={topico} compacto />;
      case "notas":
        return (
          <NotasBloco
            topico={topico}
            indice={indice}
            roteiroId={roteiroId}
            onSalvarTopico={onSalvarTopico}
          />
        );
      case "flashcards":
        return (
          <FlashcardsBloco topico={topico} onSalvarTopico={onSalvarTopico} />
        );
      case "quiz":
        return <QuizBloco topico={topico} />;
    }
  }

  const escolhaAtual = arranjos?.escolha[chave] ?? "custom";
  const podeExcluir =
    escolhaAtual !== "custom" && !escolhaAtual.startsWith("preset:");

  const visiveis = layout ? layout.filter((b) => !b.oculto) : [];
  const ocultos = layout ? layout.filter((b) => b.oculto) : [];
  const linhas = visiveis.length
    ? Math.max(...visiveis.map((b) => b.y + b.h))
    : 0;
  const altura = linhas > 0 ? linhas * passoY - ESPACO : 0;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-100 dark:bg-slate-950">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Workspace em blocos · Tópico {indice + 1}
          </p>
          <h2 className="truncate font-semibold">{topico?.titulo}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <select
            value={escolhaAtual}
            onChange={(e) => aplicar(e.target.value)}
            title="Escolher o arranjo deste tópico"
            className="max-w-[16rem] rounded-lg border border-slate-300 bg-white px-2 py-1 font-medium outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="custom">Personalizado</option>
            <optgroup label="Prontos">
              {PRESETS.map((p) => (
                <option key={p.nome} value={presetId(p.nome)}>
                  {p.nome}
                </option>
              ))}
            </optgroup>
            {arranjos && arranjos.salvos.length > 0 && (
              <optgroup label="Meus arranjos">
                {arranjos.salvos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <button
            onClick={salvarArranjo}
            title="Salvar o arranjo atual com um nome"
            className="rounded-lg border border-slate-300 px-2 py-1 font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            💾 Salvar arranjo
          </button>
          {podeExcluir && (
            <button
              onClick={() => excluirArranjo(escolhaAtual)}
              title="Excluir este arranjo salvo"
              className="rounded-lg border border-slate-300 px-2 py-1 font-medium text-red-600 hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              🗑 Excluir
            </button>
          )}
        </div>

        {ocultos.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 dark:text-slate-500">Ocultos:</span>
            {ocultos.map((b) => (
              <button
                key={b.id}
                onClick={() => mostrar(b.id)}
                title="Mostrar bloco"
                className="rounded-lg bg-slate-100 px-2 py-1 font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                + {TIPOS[b.id].icone} {TIPOS[b.id].rotulo}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={onFechar}
          className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          ← Voltar ao painel
        </button>
      </header>

      <div className="flex-1 overflow-auto p-2">
        {!layout ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Carregando arranjo...
          </p>
        ) : ehMobile ? (
          // Celular: blocos empilhados (sem arrastar/redimensionar).
          <div className="space-y-4">
            {TIPOS_ORDEM.filter((id) => visiveis.some((v) => v.id === id)).map(
              (id) => (
                <section
                  key={id}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      {TIPOS[id].icone} {TIPOS[id].rotulo}
                    </h3>
                    <button
                      onClick={() => ocultar(id)}
                      title="Ocultar bloco"
                      className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                    >
                      👁
                    </button>
                  </div>
                  {conteudo(id)}
                </section>
              ),
            )}
          </div>
        ) : (
          <div
            ref={areaRef}
            className="relative w-full"
            style={{ height: altura }}
          >
            {largura > 0 &&
              visiveis.map((b) => {
                const arrastandoEste = preview?.id === b.id;
                const exibido = arrastandoEste && preview ? preview : b;
                const invalido =
                  arrastandoEste && preview ? !cabe(layout, preview) : false;
                return (
                  <div
                    key={b.id}
                    style={{
                      left: exibido.x * passoX,
                      top: exibido.y * passoY,
                      width: exibido.w * colW + (exibido.w - 1) * ESPACO,
                      height:
                        exibido.h * ALTURA_LINHA + (exibido.h - 1) * ESPACO,
                    }}
                    className={`absolute flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-slate-900 ${
                      invalido
                        ? "border-red-400 ring-2 ring-red-400/70"
                        : ativo === b.id
                          ? "border-blue-500 shadow-lg ring-2 ring-blue-400/60 dark:border-blue-500"
                          : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <header
                      onPointerDown={(e) => iniciar(e, b, "mover")}
                      style={{ touchAction: "none" }}
                      className="flex cursor-grab items-center gap-2 border-b border-slate-200 bg-slate-50 px-2.5 py-1.5 select-none active:cursor-grabbing dark:border-slate-800 dark:bg-slate-800/60"
                    >
                      <span className="text-sm font-semibold">
                        {TIPOS[b.id].icone} {TIPOS[b.id].rotulo}
                      </span>
                      <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                        ⠿
                      </span>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => ocultar(b.id)}
                        title="Ocultar bloco"
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                      >
                        👁
                      </button>
                    </header>

                    <div className="min-h-0 flex-1 overflow-auto p-2">
                      {conteudo(b.id)}
                    </div>

                    <div
                      onPointerDown={(e) => iniciar(e, b, "redimensionar")}
                      style={{ touchAction: "none" }}
                      title="Redimensionar"
                      className="absolute right-0 bottom-0 h-4 w-4 cursor-se-resize"
                    >
                      <span className="absolute right-1 bottom-1 h-2 w-2 border-r-2 border-b-2 border-slate-400 dark:border-slate-500" />
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
