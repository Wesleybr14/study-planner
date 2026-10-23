"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [sessoes, setSessoes] = useState<any[]>([]);
  const [roteiros, setRoteiros] = useState<any[]>([]);
  const [totais, setTotais] = useState({
    roteiros: 0,
    concluidos: 0,
    topicos: 0,
  });

  const carregar = useCallback(async () => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) return router.replace("/login");

    const [{ data: s, error: e1 }, { data: r, error: e2 }] = await Promise.all([
      supabase
        .from("sessoes")
        .select("segundos, criado_em, roteiro_id, topico_index")
        .order("criado_em", { ascending: false }),
      supabase.from("roteiros").select("id, tema, topicos"),
    ]);

    if (e1 || e2) setErro((e1 ?? e2)!.message);
    setSessoes(s ?? []);
    setRoteiros(r ?? []);
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
  }, [router]);

  useEffect(() => {
    carregar();
  }, [carregar]);

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

  // Tempo por roteiro
  const porRoteiro = roteiros
    .map((r) => {
      const seg = sessoes
        .filter((s) => s.roteiro_id === r.id)
        .reduce((a, s) => a + s.segundos, 0);
      return { id: r.id, tema: r.tema, min: seg / 60 };
    })
    .filter((x) => x.min > 0)
    .sort((a, b) => b.min - a.min);
  const maxRoteiro = Math.max(1, ...porRoteiro.map((x) => x.min));

  const historico = sessoes.slice(0, 15);

  function nomeTopico(s: any): string {
    if (!s.roteiro_id) return "Sessão livre";
    const r = roteiros.find((x) => x.id === s.roteiro_id);
    if (!r) return "Roteiro removido";
    const t = r.topicos?.find(
      (t: any, i: number) => (t.recursoIndex ?? i) === s.topico_index,
    );
    return t ? `${r.tema} · ${t.titulo}` : r.tema;
  }

  return (
    <AppShell>
      {erro && (
        <p role="alert">
          Não foi possível carregar os dados: {erro}{" "}
          <button onClick={carregar}>Tentar novamente</button>
        </p>
      )}
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Seu progresso</h1>
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

          {porRoteiro.length > 0 && (
            <div className={`${card} mt-4`}>
              <p className="mb-3 text-sm font-semibold">Tempo por roteiro</p>
              <div className="space-y-2">
                {porRoteiro.map((x) => (
                  <div key={x.id}>
                    <div className="flex justify-between text-xs">
                      <span className="truncate pr-2">{x.tema}</span>
                      <span className="shrink-0 text-slate-500 dark:text-slate-400">
                        {formatarMinutos(x.min)}
                      </span>
                    </div>
                    <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-purple-500"
                        style={{ width: `${(x.min / maxRoteiro) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {historico.length > 0 && (
            <div className={`${card} mt-4`}>
              <p className="mb-3 text-sm font-semibold">Histórico de sessões</p>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {historico.map((s, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate">{nomeTopico(s)}</p>
                      <p className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(s.criado_em).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <span className="shrink-0 font-medium text-blue-600 dark:text-blue-400">
                      {formatarMinutos(s.segundos / 60)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </AppShell>
  );
}
