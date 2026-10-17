"use client";

import { useRef, useState, type ReactNode } from "react";
import Cronometro from "@/components/Cronometro";
import {
  alternarTarefa,
  envolverTexto,
  parseNota,
  prefixarLinha as prefixarNoTexto,
  type BlocoNota,
  type Token,
} from "@/lib/notas";

/** Renderiza a formatação em linha (negrito, itálico, riscado, grifar, link). */
function tokensJSX(tokens: Token[], base: string): ReactNode[] {
  return tokens.map((tk, k) => {
    const key = `${base}-${k}`;
    if ("link" in tk)
      return (
        <a
          key={key}
          href={tk.link}
          target="_blank"
          rel="noreferrer"
          className="text-blue-600 underline hover:opacity-80 dark:text-blue-400"
        >
          {tk.t}
        </a>
      );
    if ("m" in tk) {
      switch (tk.m) {
        case "negrito":
          return <strong key={key}>{tk.t}</strong>;
        case "riscado":
          return <s key={key}>{tk.t}</s>;
        case "grifado":
          return (
            <mark
              key={key}
              className="rounded-sm bg-amber-200 px-0.5 text-slate-900 dark:bg-amber-400/70 dark:text-slate-950"
            >
              {tk.t}
            </mark>
          );
        case "italico":
          return <em key={key}>{tk.t}</em>;
      }
    }
    return tk.t;
  });
}

/** Converte um bloco estruturado em JSX. */
function blocoJSX(
  b: BlocoNota,
  i: number,
  aoAlternar: (linha: number) => void,
): ReactNode {
  switch (b.tipo) {
    case "regra":
      return (
        <hr
          key={`hr${i}`}
          className="my-2 border-0 border-t border-slate-200 dark:border-slate-700"
        />
      );
    case "titulo":
      return (
        <p
          key={`h${i}`}
          className={
            b.nivel === 1
              ? "mt-3 text-base font-bold"
              : "mt-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200"
          }
        >
          {tokensJSX(b.tokens, `h${i}`)}
        </p>
      );
    case "tarefas":
      return (
        <ul key={`t${i}`} className="my-1 space-y-1">
          {b.itens.map((it) => (
            <li key={it.linha} className="flex items-start gap-1.5">
              <button
                type="button"
                onClick={() => aoAlternar(it.linha)}
                title={it.feito ? "Desmarcar" : "Marcar como feito (risca)"}
                className="mt-px shrink-0 text-sm leading-6 transition hover:scale-110"
              >
                {it.feito ? "☑️" : "⬜"}
              </button>
              <span
                className={
                  "min-w-0 flex-1" +
                  (it.feito
                    ? " text-slate-400 line-through dark:text-slate-500"
                    : "")
                }
              >
                {tokensJSX(it.tokens, `t${it.linha}`)}
              </span>
            </li>
          ))}
        </ul>
      );
    case "lista":
      return (
        <ul key={`b${i}`} className="my-1 list-disc space-y-1 pl-5">
          {b.itens.map((it) => (
            <li key={it.linha}>{tokensJSX(it.tokens, `b${it.linha}`)}</li>
          ))}
        </ul>
      );
    case "numerada":
      return (
        <ol key={`o${i}`} className="my-1 list-decimal space-y-1 pl-5">
          {b.itens.map((it) => (
            <li key={it.linha}>{tokensJSX(it.tokens, `o${it.linha}`)}</li>
          ))}
        </ol>
      );
    case "citacao":
      return (
        <blockquote
          key={`q${i}`}
          className="my-2 border-l-2 border-blue-400 pl-2 text-slate-600 dark:text-slate-300"
        >
          {b.itens.map((it) => (
            <span key={it.linha} className="block">
              {tokensJSX(it.tokens, `q${it.linha}`)}
            </span>
          ))}
        </blockquote>
      );
    default:
      return (
        <p key={`p${i}`} className="my-1 leading-relaxed">
          {tokensJSX(b.tokens, `p${i}`)}
        </p>
      );
  }
}

/**
 * Bloco de anotações: cronômetro + editor em estilo "caderno" — títulos,
 * tópicos em lista, tarefas que riscam ao concluir, negrito, itálico, grifar —
 * com aba de visualização e checkboxes clicáveis.
 */
export default function NotasBloco({
  topico,
  indice,
  roteiroId,
  onSalvarTopico,
}: {
  topico: any;
  indice: number;
  roteiroId: string;
  onSalvarTopico: (patch: Record<string, any>) => void;
}) {
  const [nota, setNota] = useState<string>(topico?.nota ?? "");
  const [modo, setModo] = useState<"editar" | "ver">("editar");
  const ref = useRef<HTMLTextAreaElement>(null);

  function guardar(texto: string) {
    setNota(texto);
    onSalvarTopico({ nota: texto });
  }

  /** Cerca a seleção com uma marcação (ou insere o marcador vazio). */
  function envolver(abre: string, fecha: string) {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart: ini, selectionEnd: fim, value } = ta;
    const { novo, iniSel, fimSel } = envolverTexto(
      value,
      ini,
      fim,
      abre,
      fecha,
    );
    guardar(novo);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(iniSel, fimSel);
    });
  }

  /** Acrescenta uma marca de lista no início da linha atual. */
  function prefixar(marca: string) {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart, value } = ta;
    const { novo, cursor } = prefixarNoTexto(value, selectionStart, marca);
    guardar(novo);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(cursor, cursor);
    });
  }

  /** Marca/desmarca uma tarefa (usado na visualização). */
  function alternarLinha(linha: number) {
    guardar(alternarTarefa(nota, linha));
  }

  const btn =
    "h-6 min-w-6 rounded border border-slate-200 px-1.5 text-xs leading-none hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:hover:bg-slate-800";

  const blocos = parseNota(nota);

  return (
    <div className="space-y-3">
      <Cronometro roteiroId={roteiroId} topicoIndex={indice} />
      <div>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">📝 Minhas anotações</h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            salvo automaticamente
          </span>
        </div>

        <div className="mb-1.5 flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => prefixar("## ")}
            title="Título"
            className={`${btn} font-bold`}
          >
            H
          </button>
          <button
            type="button"
            onClick={() => prefixar("- ")}
            title="Tópico (lista com marcador)"
            className={btn}
          >
            •
          </button>
          <button
            type="button"
            onClick={() => prefixar("- [ ] ")}
            title="Tarefa (fica riscada ao concluir)"
            className={btn}
          >
            ☑
          </button>
          <button
            type="button"
            onClick={() => prefixar("1. ")}
            title="Item numerado"
            className={`${btn} font-semibold`}
          >
            1.
          </button>

          <span className="mx-1 h-4 w-px bg-slate-200 dark:bg-slate-700" />

          <button
            type="button"
            onClick={() => envolver("**", "**")}
            title="Negrito"
            className={`${btn} font-bold`}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => envolver("*", "*")}
            title="Itálico"
            className={`${btn} italic`}
          >
            I
          </button>
          <button
            type="button"
            onClick={() => envolver("~~", "~~")}
            title="Riscar"
            className={`${btn} line-through`}
          >
            S
          </button>
          <button
            type="button"
            onClick={() => envolver("==", "==")}
            title="Grifar"
            className={`${btn} rounded bg-amber-200 dark:bg-amber-400/60`}
          >
            ✏
          </button>

          <button
            type="button"
            onClick={() => {
              onSalvarTopico({ nota });
              setModo(modo === "editar" ? "ver" : "editar");
            }}
            title="Alternar entre editar e visualizar"
            className={`${btn} ml-auto`}
          >
            {modo === "editar" ? "👁 Visualizar" : "✏️ Editar"}
          </button>
        </div>

        {modo === "editar" ? (
          <>
            <textarea
              ref={ref}
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              onBlur={() => onSalvarTopico({ nota })}
              rows={7}
              placeholder="Escreva aqui o que aprendeu, dúvidas, links..."
              className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm leading-relaxed outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
            {!nota && (
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500">
                Barra de ferramentas: <b>H</b> título · <b>•</b> tópico ·{" "}
                <b>☑</b> tarefa (risca ao concluir) · <b>B</b> negrito ·{" "}
                <b>I</b> itálico · <b>S</b> riscar · <b>✏</b> grifar. Selecione
                o texto e clique para aplicar.
              </p>
            )}
          </>
        ) : (
          <div className="min-h-[7rem] rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
            {blocos.length ? (
              blocos.map((b, i) => blocoJSX(b, i, alternarLinha))
            ) : (
              <p className="text-slate-400 dark:text-slate-500">
                Nada anotado ainda.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
