"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { calcularCronograma, type Planejamento } from "@/lib/cronograma";
type Roteiro = {
  id: string;
  tema: string;
  prazo?: string | null;
  topicos: any[];
  planejamento?: Planejamento | null;
};
export default function Hoje({ roteiros }: { roteiros: Roteiro[] }) {
  const [ultimo, setUltimo] = useState<string | null>(null);
  useEffect(() => {
    try {
      setUltimo(
        JSON.parse(localStorage.getItem("ultimo-estudo") ?? "null")?.id ?? null,
      );
    } catch {}
  }, []);
  if (!roteiros.length) return null;
  const anterior = roteiros.find((r) => r.id === ultimo);
  const planos = roteiros.map((r) => ({ r, c: calcularCronograma(r) }));
  const dificuldades = roteiros.flatMap((r) =>
    r.topicos
      .filter((t) => {
        const a = t.tentativas?.at(-1);
        return a && a.acertos / a.total < 0.7;
      })
      .map((t) => ({ id: r.id, tema: r.tema, titulo: t.titulo })),
  );
  return (
    <section className="today-panel" aria-labelledby="hoje">
      <h2 id="hoje" className="mb-2 text-lg font-semibold">
        Seu estudo de hoje
      </h2>
      {anterior && (
        <Link
          className="mb-3 inline-block text-blue-600 underline dark:text-blue-400"
          href={`/tema/${anterior.id}?continuar=1`}
        >
          Continuar: {anterior.tema}
        </Link>
      )}
      <ul className="space-y-2">
        {planos.flatMap(({ r, c }) =>
          c.hoje.map((t) => (
            <li key={`${r.id}:${t.indice}`}>
              <Link
                className="underline"
                href={`/tema/${r.id}?topico=${t.indice}`}
              >
                {r.tema}: {t.titulo}
              </Link>{" "}
              · {Math.round(t.horas * 60)} min
            </li>
          )),
        )}
      </ul>
      {!planos.some((p) => p.c.hoje.length) && (
        <p className="text-sm">
          Sem tarefas agendadas para hoje. Você pode revisar flashcards ou abrir
          um roteiro.
        </p>
      )}
      {planos
        .filter((p) => p.c.inviavel && !p.c.concluido)
        .map(({ r, c }) => (
          <p
            key={r.id}
            role="status"
            className="mt-2 text-sm text-amber-700 dark:text-amber-300"
          >
            {r.tema}:{" "}
            {c.atrasado ? "prazo vencido" : "carga acima da disponibilidade"}.{" "}
            {c.horasNaoAgendadas} h ficaram fora do cronograma. Ajuste a meta ou
            a carga semanal no roteiro.
          </p>
        ))}
      {!!dificuldades.length && (
        <p className="mt-3 text-sm">
          Reforce os assuntos com menos de 70% de acertos:{" "}
          {dificuldades.map((t, i) => (
            <Link className="mr-2 underline" key={i} href={`/tema/${t.id}`}>
              {t.titulo}
            </Link>
          ))}
        </p>
      )}
    </section>
  );
}
