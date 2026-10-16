"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppShell from "@/components/AppShell";

function formatarMinutos(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${r}min`;
}

function inicioDoDia(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default function Estatisticas() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [totais, setTotais] = useState({
    roteiros: 0,
    concluidos: 0,
    topicos: 0,
  });

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) return router.replace("/login");

    const [{ data: s }, { data: r }] = await Promise.all([
      supabase.from("sessoes").select("segundos, criado_em"),
      supabase.from("roteiros").select("topicos"),
    ]);

    setSessoes(s ?? []);
    const totalTopicos = (r ?? []).reduce(
      (a, x: any) => a + (x.topicos?.length ?? 0),
      0,
    );
    const concluidos = (r ?? []).reduce(
      (a, x: any) =>
        a + (x.topicos?.filter((t: any) => t.concluido)?.length ?? 0),
      0,
    );
    setTotais({
      roteiros: (r ?? []).length,
      concluidos,
      topicos: totalTopicos,
    });
    setCarregando(false);
  }

  const hoje = inicioDoDia(new Date());
  const totalMin = sessoes.reduce((a, s) => a + s.segundos, 0) / 60;
  const minHoje =
    sessoes
      .filter(
        (s) => inicioDoDia(new Date(s.criado_em)).getTime() === hoje.getTime(),
      )
      .reduce((a, s) => a + s.segundos, 0) / 60;

  // Últimos 7 dias
  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(hoje);
    d.setDate(d.getDate() - (6 - i));
    return { data: d, min: 0 };
  });
  for (const s of sessoes) {
    const d = inicioDoDia(new Date(s.criado_em)).getTime();
    const item = dias.find((x) => x.data.getTime() === d);
    if (item) item.min += s.segundos / 60;
  }
  const maxMin = Math.max(1, ...dias.map((d) => d.min));

  // Sequência de dias (streak)
  const diasAtivos = new Set(
    sessoes.map((s) => inicioDoDia(new Date(s.criado_em)).getTime()),
  );
  let streak = 0;
  let cursor = new Date(hoje);
  if (!diasAtivos.has(cursor.getTime())) cursor.setDate(cursor.getDate() - 1);
  while (diasAtivos.has(cursor.getTime())) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const card =
    "rounded-xl bg-white p-4 shadow dark:border dark:border-slate-800 dark:bg-slate-900";

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">📊 Estatísticas</h1>
      </header>

      {carregando ? (
        <p className="text-slate-500 dark:text-slate-400">Carregando...</p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className={card}>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tempo total
              </p>
              <p className="text-2xl font-bold">{formatarMinutos(totalMin)}</p>
            </div>
            <div className={card}>
              <p className="text-sm text-slate-500 dark:text-slate-400">Hoje</p>
              <p className="text-2xl font-bold">{formatarMinutos(minHoje)}</p>
            </div>
            <div className={card}>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sequência 🔥
              </p>
              <p className="text-2xl font-bold">
                {streak} {streak === 1 ? "dia" : "dias"}
              </p>
            </div>
            <div className={card}>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tópicos concluídos
              </p>
              <p className="text-2xl font-bold">
                {totais.concluidos}
                <span className="text-base font-normal text-slate-400 dark:text-slate-500">
                  /{totais.topicos}
                </span>
              </p>
            </div>
          </div>

          <div className={card}>
            <p className="mb-3 text-sm font-semibold">Últimos 7 dias</p>
            <div className="flex h-32 items-end gap-2">
              {dias.map((d, i) => (
                <div
                  key={i}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">
                    {d.min > 0 ? Math.round(d.min) : ""}
                  </span>
                  <div
                    className="w-full rounded-t bg-blue-500"
                    style={{
                      height: `${Math.max(2, (d.min / maxMin) * 100)}%`,
                    }}
                    title={formatarMinutos(d.min)}
                  />
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">
                    {d.data
                      .toLocaleDateString("pt-BR", { weekday: "short" })
                      .slice(0, 3)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-4 text-center text-sm text-slate-400 dark:text-slate-500">
            {totais.roteiros} {totais.roteiros === 1 ? "roteiro" : "roteiros"}{" "}
            de estudo
          </p>
        </>
      )}
    </AppShell>
  );
}
