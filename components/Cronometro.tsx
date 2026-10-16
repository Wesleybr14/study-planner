"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const FOCO_SEG = 25 * 60;
const PAUSA_SEG = 5 * 60;

function formatar(seg: number): string {
  const m = Math.floor(seg / 60)
    .toString()
    .padStart(2, "0");
  const s = (seg % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

/** Cronômetro de estudo: modo livre (cronômetro) ou Pomodoro (25/5). */
export default function Cronometro({
  roteiroId,
  topicoIndex,
}: {
  roteiroId: string;
  topicoIndex: number;
}) {
  const [modo, setModo] = useState<"livre" | "pomodoro">("livre");
  const [rodando, setRodando] = useState(false);
  const [segundos, setSegundos] = useState(0); // livre: decorrido | pomodoro: restante
  const [fase, setFase] = useState<"foco" | "pausa">("foco");
  const [msg, setMsg] = useState("");

  // Motor do relógio
  useEffect(() => {
    if (!rodando) return;
    const id = setInterval(() => {
      setSegundos((s) => (modo === "livre" ? s + 1 : Math.max(0, s - 1)));
    }, 1000);
    return () => clearInterval(id);
  }, [rodando, modo]);

  // Fim de fase no Pomodoro
  useEffect(() => {
    if (modo !== "pomodoro" || !rodando || segundos !== 0) return;
    if (fase === "foco") {
      salvarSessao(FOCO_SEG);
      setFase("pausa");
      setSegundos(PAUSA_SEG);
      setMsg("Bloco de foco concluído! Hora da pausa ☕");
    } else {
      setFase("foco");
      setSegundos(FOCO_SEG);
      setMsg("Pausa terminada. Vamos focar! 💪");
    }
  }, [segundos, modo, rodando, fase]);

  async function salvarSessao(sec: number) {
    if (sec < 5) return;
    const { data: auth } = await supabase.auth.getSession();
    const userId = auth.session?.user.id;
    await supabase.from("sessoes").insert({
      user_id: userId,
      roteiro_id: roteiroId,
      topico_index: topicoIndex,
      segundos: sec,
    });
  }

  async function finalizarLivre() {
    await salvarSessao(segundos);
    setMsg(`Sessão de ${formatar(segundos)} registrada! ✅`);
    setSegundos(0);
    setRodando(false);
  }

  function trocarModo(novo: "livre" | "pomodoro") {
    setModo(novo);
    setRodando(false);
    setMsg("");
    setFase("foco");
    setSegundos(novo === "pomodoro" ? FOCO_SEG : 0);
  }

  function resetar() {
    setRodando(false);
    setMsg("");
    setFase("foco");
    setSegundos(modo === "pomodoro" ? FOCO_SEG : 0);
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">⏱ Tempo de estudo</h3>
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
          <button
            onClick={() => trocarModo("livre")}
            className={`rounded-md px-2 py-1 ${
              modo === "livre" ? "bg-white shadow dark:bg-slate-700" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Livre
          </button>
          <button
            onClick={() => trocarModo("pomodoro")}
            className={`rounded-md px-2 py-1 ${
              modo === "pomodoro" ? "bg-white shadow dark:bg-slate-700" : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Pomodoro
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-3xl font-bold tabular-nums">{formatar(segundos)}</span>
        {modo === "pomodoro" && (
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              fase === "foco"
                ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300"
            }`}
          >
            {fase === "foco" ? "Foco" : "Pausa"}
          </span>
        )}

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setRodando((r) => !r)}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {rodando ? "Pausar" : "Iniciar"}
          </button>
          {modo === "livre" ? (
            <button
              onClick={finalizarLivre}
              disabled={segundos === 0}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Finalizar
            </button>
          ) : (
            <button
              onClick={resetar}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Reiniciar
            </button>
          )}
        </div>
      </div>

      {msg && <p className="mt-2 text-xs text-green-600 dark:text-green-400">{msg}</p>}
    </div>
  );
}
