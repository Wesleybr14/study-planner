"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import {
  estaVencido,
  revisar,
  textoIntervalo,
  type EstadoRevisao,
  type Qualidade,
} from "@/lib/revisao";

type CardRef = {
  roteiroId: string;
  tema: string;
  topicoTitulo: string;
  topicoIndex: number;
  cardIndex: number;
  frente: string;
  verso: string;
  estado: EstadoRevisao;
};

export default function Revisao() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [roteiros, setRoteiros] = useState<any[]>([]);
  const [fila, setFila] = useState<CardRef[]>([]);
  const [pos, setPos] = useState(0);
  const [mostrar, setMostrar] = useState(false);
  const [feitas, setFeitas] = useState(0);
  const [ultimo, setUltimo] = useState<{
    qualidade: Qualidade;
    intervalo: number;
  } | null>(null);

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) return router.replace("/login");

    const { data } = await supabase.from("roteiros").select("*");
    setRoteiros(data ?? []);

    const cards: CardRef[] = [];
    for (const r of data ?? []) {
      (r.topicos ?? []).forEach((t: any, ti: number) => {
        (t.flashcards ?? []).forEach((f: any, ci: number) => {
          const estado: EstadoRevisao = {
            ease: f.ease ?? 2.5,
            intervalo: f.intervalo ?? 0,
            reps: f.reps ?? 0,
            proxima: f.proxima ?? null,
          };
          if (estaVencido(estado)) {
            cards.push({
              roteiroId: r.id,
              tema: r.tema,
              topicoTitulo: t.titulo,
              topicoIndex: ti,
              cardIndex: ci,
              frente: f.frente,
              verso: f.verso,
              estado,
            });
          }
        });
      });
    }
    setFila(cards);
    setCarregando(false);
  }

  async function responder(q: Qualidade) {
    const card = fila[pos];
    const novo = revisar(card.estado, q);

    const roteiro = roteiros.find((r) => r.id === card.roteiroId);
    const topicos = roteiro.topicos.map((t: any, ti: number) =>
      ti === card.topicoIndex
        ? {
            ...t,
            flashcards: t.flashcards.map((f: any, ci: number) =>
              ci === card.cardIndex ? { ...f, ...novo } : f,
            ),
          }
        : t,
    );

    setRoteiros((prev) =>
      prev.map((r) => (r.id === card.roteiroId ? { ...r, topicos } : r)),
    );
    await supabase
      .from("roteiros")
      .update({ topicos })
      .eq("id", card.roteiroId);

    setUltimo({ qualidade: q, intervalo: novo.intervalo });
    setMostrar(false);
    setFeitas((f) => f + 1);
    setPos((p) => p + 1);
  }

  const card = fila[pos];

  return (
    <AppShell largura="foco">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">🔁 Revisão</h1>
      </header>

      {carregando ? (
        <p className="text-slate-500 dark:text-slate-400">Carregando...</p>
      ) : fila.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow dark:border dark:border-slate-800 dark:bg-slate-900">
          <p className="text-lg font-medium">🎉 Nada para revisar agora!</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gere flashcards nos seus tópicos e volte para revisá-los.
          </p>
        </div>
      ) : !card ? (
        <div className="rounded-xl bg-white p-8 text-center shadow dark:border dark:border-slate-800 dark:bg-slate-900">
          <p className="text-lg font-medium">✅ Revisão concluída!</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Você revisou {feitas} {feitas === 1 ? "card" : "cards"} hoje.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Voltar aos estudos
          </Link>
        </div>
      ) : (
        <>
          <div className="mb-2 flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
            <span>
              {pos + 1} de {fila.length}
            </span>
            <span>{card.tema}</span>
          </div>

          <div className="rounded-xl bg-white p-6 shadow dark:border dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {card.topicoTitulo}
            </p>
            <p className="mt-3 text-lg font-medium">{card.frente}</p>

            {mostrar ? (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                {card.verso}
              </div>
            ) : (
              <button
                onClick={() => setMostrar(true)}
                className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
              >
                Mostrar resposta
              </button>
            )}
          </div>

          {mostrar && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                onClick={() => responder("dificil")}
                className="rounded-lg bg-red-100 py-3 text-sm font-medium text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900/60"
              >
                🔴 Difícil
              </button>
              <button
                onClick={() => responder("bom")}
                className="rounded-lg bg-yellow-100 py-3 text-sm font-medium text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900/40 dark:text-yellow-300 dark:hover:bg-yellow-900/60"
              >
                🟡 Bom
              </button>
              <button
                onClick={() => responder("facil")}
                className="rounded-lg bg-green-100 py-3 text-sm font-medium text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60"
              >
                🟢 Fácil
              </button>
            </div>
          )}

          {ultimo && (
            <p className="mt-3 text-center text-xs text-slate-400 dark:text-slate-500">
              Próxima revisão {textoIntervalo(ultimo.intervalo)} · {feitas}{" "}
              revisados
            </p>
          )}
        </>
      )}
    </AppShell>
  );
}
