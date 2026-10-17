"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ALTURA_LINHA,
  COLUNAS,
  ESPACO,
  LAYOUT_PADRAO,
  PRESETS,
  TIPOS,
  TIPOS_ORDEM,
  cabe,
  carregarLayout,
  normalizarLayout,
  salvarLayout,
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
 * layouts prontos. O arranjo é salvo na nuvem (único para todos os tópicos).
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
  const [layout, setLayout] = useState<Bloco[] | null>(null);
  const [ativo, setAtivo] = useState<TipoBloco | null>(null);
  const [preview, setPreview] = useState<Bloco | null>(null);
  const [largura, setLargura] = useState(0);
  const [ehMobile, setEhMobile] = useState(false);

  const areaRef = useRef<HTMLDivElement>(null);
  const arrasto = useRef<Arrasto | null>(null);
  const previewRef = useRef<Bloco | null>(null);
  const layoutRef = useRef<Bloco[] | null>(null);
  const primeiraCarga = useRef(true);

  // Carrega o arranjo salvo (ou usa o padrão).
  useEffect(() => {
    let vivo = true;
    carregarLayout().then(
      (l) => vivo && setLayout(l ?? normalizarLayout(null)),
    );
    return () => {
      vivo = false;
    };
  }, []);

  // Salva o arranjo (com um pequeno atraso) sempre que ele mudar.
  useEffect(() => {
    if (!layout) return;
    if (primeiraCarga.current) {
      primeiraCarga.current = false;
      return;
    }
    const t = setTimeout(() => salvarLayout(layout), 700);
    return () => clearTimeout(t);
  }, [layout]);

  // Detecta o celular (uma vez no mount).
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const atualiza = () => setEhMobile(mq.matches);
    atualiza();
    mq.addEventListener("change", atualiza);
    return () => mq.removeEventListener("change", atualiza);
  }, []);

  // Mede a largura da área da grade. Roda quando a grade passa a existir
  // (depois do layout carregar), senão o ref ainda não estaria no DOM.
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

  // Mantém uma referência sempre atual do layout (evita closures desatualizadas).
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

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
      setLayout(atual.map((b) => (b.id === d.id ? p : b)));
    }
    arrasto.current = null;
    previewRef.current = null;
    setPreview(null);
    setAtivo(null);
    window.removeEventListener("pointermove", aoMover);
    window.removeEventListener("pointerup", aoSoltar);
  }, [aoMover]);

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

  function aplicarPreset(preset: Bloco[]) {
    setLayout(normalizarLayout(preset));
  }

  function conteudo(id: TipoBloco) {
    switch (id) {
      case "video":
        return <VideosBloco topico={topico} />;
      case "livro":
        return <LivrosBloco topico={topico} />;
      case "artigos":
        return <ArtigosBloco topico={topico} />;
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

  const linhas = layout ? Math.max(...layout.map((b) => b.y + b.h)) : 0;
  const altura = linhas > 0 ? linhas * passoY - ESPACO : 0;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-100 dark:bg-slate-950">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Workspace em blocos · Tópico {indice + 1}
          </p>
          <h2 className="truncate font-semibold">{topico?.titulo}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {PRESETS.map((p) => (
            <button
              key={p.nome}
              onClick={() => aplicarPreset(p.layout)}
              className="rounded-lg border border-slate-300 px-2 py-1 font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {p.nome}
            </button>
          ))}
          <button
            onClick={() => setLayout(LAYOUT_PADRAO.map((b) => ({ ...b })))}
            className="rounded-lg border border-slate-300 px-2 py-1 font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            ↺ Padrão
          </button>
        </div>

        <button
          onClick={onFechar}
          className="ml-auto rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
        >
          ← Voltar ao painel
        </button>
      </header>

      <div className="flex-1 overflow-auto p-4">
        {!layout ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Carregando arranjo...
          </p>
        ) : ehMobile ? (
          // Celular: blocos empilhados (sem arrastar/redimensionar).
          <div className="space-y-4">
            {TIPOS_ORDEM.map((id) => (
              <section
                key={id}
                className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <h3 className="mb-2 text-sm font-semibold">
                  {TIPOS[id].icone} {TIPOS[id].rotulo}
                </h3>
                {conteudo(id)}
              </section>
            ))}
          </div>
        ) : (
          <div
            ref={areaRef}
            className="relative mx-auto w-full max-w-[1400px]"
            style={{ height: altura }}
          >
            {largura > 0 &&
              layout.map((b) => {
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
                      className="flex cursor-grab items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 select-none active:cursor-grabbing dark:border-slate-800 dark:bg-slate-800/60"
                    >
                      <span className="text-sm font-semibold">
                        {TIPOS[b.id].icone} {TIPOS[b.id].rotulo}
                      </span>
                      <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                        ⠿
                      </span>
                    </header>

                    <div className="min-h-0 flex-1 overflow-auto p-3">
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
