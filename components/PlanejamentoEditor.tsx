"use client";
import { useState } from "react";
import type { Planejamento } from "@/lib/cronograma";
export default function PlanejamentoEditor({
  prazo,
  planejamento,
  salvar,
}: {
  prazo?: string | null;
  planejamento?: Planejamento;
  salvar: (patch: {
    prazo: string | null;
    planejamento: Planejamento;
  }) => Promise<void>;
}) {
  const [meta, setMeta] = useState(prazo ?? "");
  const [horas, setHoras] = useState(planejamento?.horasSemana ?? 7);
  const [dias, setDias] = useState(planejamento?.diasSemana ?? [1, 2, 3, 4, 5]);
  const [estado, setEstado] = useState("");
  const [ocupado, setOcupado] = useState(false);
  return (
    <details className="mb-4 rounded-lg border p-3 dark:border-slate-700">
      <summary className="cursor-pointer">
        Ajustar meta e disponibilidade
      </summary>
      <form
        className="mt-3 flex flex-wrap items-center gap-3"
        onSubmit={async (e) => {
          e.preventDefault();
          setOcupado(true);
          try {
            await salvar({
              prazo: meta || null,
              planejamento: {
                ...planejamento,
                horasSemana: horas,
                diasSemana: dias,
              },
            });
            setEstado("Planejamento atualizado.");
          } catch {
            setEstado("Falha ao salvar. Tente novamente.");
          } finally {
            setOcupado(false);
          }
        }}
      >
        <label>
          Meta{" "}
          <input
            className="rounded border p-2 dark:bg-slate-800"
            type="date"
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
          />
        </label>
        <label>
          Horas/semana{" "}
          <input
            className="w-20 rounded border p-2 dark:bg-slate-800"
            type="number"
            min="0.5"
            max="112"
            step="0.5"
            required
            value={horas}
            onChange={(e) => setHoras(Number(e.target.value))}
          />
        </label>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Dias de estudo"
        >
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d, i) => (
            <label className="flex min-h-11 items-center gap-1" key={d}>
              <input
                type="checkbox"
                checked={dias.includes(i)}
                onChange={() =>
                  setDias((v) =>
                    v.includes(i) ? v.filter((x) => x !== i) : [...v, i],
                  )
                }
              />
              {d}
            </label>
          ))}
        </div>
        <button
          disabled={ocupado || !dias.length}
          className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
        >
          Salvar planejamento
        </button>
        <p role="status">{estado}</p>
      </form>
    </details>
  );
}
