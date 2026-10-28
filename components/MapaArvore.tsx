"use client";
import type { KeyboardEvent } from "react";
import {
  ALTURA_NO,
  ESPACO_COLUNA,
  LARGURA_MAX_NO,
  posicionar,
  type NoArvore,
} from "@/lib/mapa";

export type VarianteNo = "raiz" | "grupo" | "feito" | "normal";

const FONTE = `ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
const PESO: Record<VarianteNo, number> = {
  raiz: 700,
  grupo: 600,
  feito: 500,
  normal: 500,
};
const TAMANHO: Record<VarianteNo, number> = {
  raiz: 13,
  grupo: 11,
  feito: 13,
  normal: 13,
};
const CAIXA: Record<VarianteNo, string> = {
  raiz: "fill-blue-600 stroke-blue-600 dark:fill-blue-500 dark:stroke-blue-500",
  grupo: "fill-slate-100 stroke-transparent dark:fill-slate-800",
  feito:
    "fill-green-50 stroke-green-500 dark:fill-green-900/40 dark:stroke-green-500",
  normal:
    "fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-700",
};
const TEXTO: Record<VarianteNo, string> = {
  raiz: "fill-white",
  grupo: "fill-slate-500 uppercase tracking-wide dark:fill-slate-400",
  feito: "fill-green-800 dark:fill-green-200",
  normal: "fill-slate-800 dark:fill-slate-100",
};

let contexto: CanvasRenderingContext2D | null | undefined;
function medir(texto: string, v: VarianteNo) {
  if (contexto === undefined)
    contexto =
      typeof document === "undefined"
        ? null
        : document.createElement("canvas").getContext("2d");
  // Grupos aparecem em maiúsculas com tracking-wide (0.025em por letra).
  const t = v === "grupo" ? texto.toUpperCase() : texto;
  const extra = v === "grupo" ? t.length * TAMANHO[v] * 0.025 : 0;
  if (!contexto) return t.length * TAMANHO[v] * 0.62 + extra;
  contexto.font = `${PESO[v]} ${TAMANHO[v]}px ${FONTE}`;
  return contexto.measureText(t).width + extra;
}

/** Corta o texto com reticências para caber na largura máxima do nó. */
function caber(texto: string, v: VarianteNo) {
  const max = LARGURA_MAX_NO - 28;
  if (medir(texto, v) <= max) return texto;
  let t = texto;
  while (t.length > 1 && medir(t + "…", v) > max) t = t.slice(0, -1);
  return t.trimEnd() + "…";
}

/** Desenha uma árvore (mapa mental) da esquerda para a direita, em SVG. */
export default function MapaArvore({
  raiz,
  variante,
  selecionado,
  rotulo = (no) => no.texto,
  arestaFeita,
  onClicar,
  onAlternar,
  titulo,
}: {
  raiz: NoArvore;
  variante: (no: NoArvore, profundidade: number) => VarianteNo;
  selecionado?: string | null;
  rotulo?: (no: NoArvore) => string;
  arestaFeita?: (no: NoArvore) => boolean;
  onClicar?: (id: string) => void;
  onAlternar?: (id: string) => void;
  titulo: string;
}) {
  // A largura do nó vem do texto real, mesmo quando o rótulo está escondido
  // (modo revisão), para o mapa não mudar de forma ao revelar.
  const variantes = new Map<string, VarianteNo>();
  const { nos, largura, altura } = posicionar(raiz, (no, d) => {
    const v = variante(no, d);
    variantes.set(no.id, v);
    return medir(caber(no.texto, v), v);
  });
  const margem = 12;
  const teclado = (fn: () => void) => (e: KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fn();
    }
  };

  return (
    <svg
      role="group"
      aria-label={titulo}
      width={largura + margem * 2}
      height={altura + margem * 2}
      viewBox={`${-margem} ${-margem} ${largura + margem * 2} ${altura + margem * 2}`}
      className="block font-sans text-[13px]"
    >
      {nos.map(({ no, pai, x, y }) =>
        pai ? (
          <path
            key={`a-${no.id}`}
            d={(() => {
              const x0 = pai.x + pai.w + (onAlternar ? 9 : 0);
              return `M${x0},${pai.y} C${x0 + ESPACO_COLUNA / 2},${pai.y} ${x - ESPACO_COLUNA / 2},${y} ${x},${y}`;
            })()}
            className={`fill-none stroke-[1.6] ${
              arestaFeita?.(no)
                ? "stroke-green-500"
                : "stroke-slate-300 dark:stroke-slate-700"
            }`}
          />
        ) : null,
      )}
      {nos.map(({ no, x, y, w }) => {
        const v = variantes.get(no.id) ?? "normal";
        const texto = rotulo(no);
        const visivel = texto === no.texto ? caber(texto, v) : texto;
        return (
          <g key={no.id}>
            <g
              role={onClicar ? "button" : undefined}
              tabIndex={onClicar ? 0 : undefined}
              aria-label={texto}
              aria-pressed={onClicar ? selecionado === no.id : undefined}
              onClick={() => onClicar?.(no.id)}
              onKeyDown={teclado(() => onClicar?.(no.id))}
              className={`${onClicar ? "cursor-pointer" : ""} outline-none [&:focus-visible>rect]:stroke-blue-500 [&:focus-visible>rect]:stroke-[2.5] [&:hover>rect]:stroke-blue-500`}
            >
              <title>{no.texto}</title>
              <rect
                x={x}
                y={y - ALTURA_NO / 2}
                width={w}
                height={ALTURA_NO}
                rx={8}
                className={`${CAIXA[v]} ${
                  selecionado === no.id
                    ? "stroke-blue-500 stroke-[2.5] dark:stroke-blue-400"
                    : "stroke-1"
                }`}
              />
              <text
                x={x + 14}
                y={y}
                dominantBaseline="central"
                fontWeight={PESO[v]}
                fontSize={TAMANHO[v]}
                className={TEXTO[v]}
              >
                {visivel}
              </text>
            </g>
            {onAlternar && no.filhos.length > 0 && (
              <g
                role="button"
                tabIndex={0}
                aria-label={`${no.recolhido ? "Expandir" : "Recolher"} ${no.texto}`}
                onClick={() => onAlternar(no.id)}
                onKeyDown={teclado(() => onAlternar(no.id))}
                className="cursor-pointer outline-none [&:focus-visible>circle]:stroke-blue-500 [&:hover>circle]:stroke-blue-500"
              >
                <circle
                  cx={x + w}
                  cy={y}
                  r={9}
                  className="fill-white stroke-slate-300 dark:fill-slate-900 dark:stroke-slate-600"
                />
                <text
                  x={x + w}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10}
                  fontWeight={600}
                  className="fill-slate-500 dark:fill-slate-400"
                >
                  {no.recolhido ? `+${no.filhos.length}` : "−"}
                </text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
