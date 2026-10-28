"use client";
import { useState } from "react";
import type { Topico } from "@/lib/models";
import type { NoArvore } from "@/lib/mapa";
import MapaArvore from "./MapaArvore";

const NIVEIS: Record<string, string> = {
  iniciante: "Iniciante",
  intermediario: "Intermediário",
  avancado: "Avançado",
};

/** Visão do roteiro em mapa: tema no centro, tópicos agrupados por nível. */
export default function MapaRoteiro({
  tema,
  topicos,
  concluidos,
  aberto,
  progresso,
  onAbrir,
}: {
  tema: string;
  topicos: Topico[];
  concluidos: boolean[];
  aberto: number | null;
  progresso: number;
  onAbrir: (indice: number) => void;
}) {
  const [recolhidos, setRecolhidos] = useState<Set<string>>(new Set());
  const indice = new Map(topicos.map((t, i) => [t.id, i]));
  // Níveis na ordem pedagógica; um nível fora da lista entra no fim.
  const niveis = [
    ...Object.keys(NIVEIS),
    ...new Set(topicos.map((t) => t.nivel).filter((n) => !NIVEIS[n])),
  ].filter((n) => topicos.some((t) => t.nivel === n));
  const raiz: NoArvore = {
    id: "raiz",
    texto: `${tema} · ${progresso}%`,
    filhos: niveis.map((n) => ({
      id: `nivel:${n}`,
      texto: NIVEIS[n] ?? n,
      recolhido: recolhidos.has(`nivel:${n}`),
      filhos: topicos
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => t.nivel === n)
        .map(({ t, i }) => ({
          id: t.id,
          texto: `${concluidos[i] ? "✓ " : ""}${i + 1}. ${t.titulo}`,
          filhos: [],
        })),
    })),
  };
  const feito = (no: NoArvore) => {
    const i = indice.get(no.id);
    return i !== undefined && !!concluidos[i];
  };

  return (
    <div className="overflow-x-auto rounded-xl bg-white p-4 shadow dark:border dark:border-slate-800 dark:bg-slate-900">
      <MapaArvore
        titulo={`Mapa do roteiro ${tema}`}
        raiz={raiz}
        variante={(no, d) =>
          d === 0 ? "raiz" : d === 1 ? "grupo" : feito(no) ? "feito" : "normal"
        }
        selecionado={aberto !== null ? topicos[aberto]?.id : null}
        arestaFeita={feito}
        onClicar={(id) => {
          const i = indice.get(id);
          if (i !== undefined) onAbrir(i);
        }}
        onAlternar={(id) =>
          setRecolhidos((r) => {
            const novo = new Set(r);
            if (!novo.delete(id)) novo.add(id);
            return novo;
          })
        }
      />
      <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
        Clique num tópico para abrir a sala de estudo. Verde = concluído.
      </p>
    </div>
  );
}
