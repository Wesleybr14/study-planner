"use client";

import { useState } from "react";
import Cronometro from "@/components/Cronometro";

/** Bloco de notas: cronômetro de estudo + anotações do tópico. */
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
  const [nota, setNota] = useState(topico?.nota ?? "");

  return (
    <div className="space-y-3">
      <Cronometro roteiroId={roteiroId} topicoIndex={indice} />
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <h3 className="text-sm font-semibold">📝 Minhas anotações</h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            salvo automaticamente
          </span>
        </div>
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onBlur={() => onSalvarTopico({ nota })}
          rows={8}
          placeholder="Escreva aqui o que aprendeu, dúvidas, links..."
          className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}
