"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  roteiroId?: string;
  topicoIndex?: number;
}) {
  type Relogio = {
    modo: "livre" | "pomodoro";
    fase: "foco" | "pausa";
    acumulado: number;
    inicio: number | null;
    sessaoId: string;
  };
  const [modo, setModo] = useState<"livre" | "pomodoro">("livre");
  const [fase, setFase] = useState<"foco" | "pausa">("foco");
  const [rodando, setRodando] = useState(false);
  const [segundos, setSegundos] = useState(0);
  const [msg, setMsg] = useState("");
  const [pronto, setPronto] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const chave = useRef("");
  const relogio = useRef<Relogio>({
    modo: "livre",
    fase: "foco",
    acumulado: 0,
    inicio: null,
    sessaoId: crypto.randomUUID(),
  });
  const decorrido = useCallback(
    (r: Relogio) =>
      r.acumulado + (r.inicio ? Math.max(0, Date.now() - r.inicio) / 1000 : 0),
    [],
  );
  function persistir() {
    if (chave.current)
      try {
        localStorage.setItem(chave.current, JSON.stringify(relogio.current));
      } catch {
        setMsg("Não foi possível guardar o cronômetro neste aparelho.");
      }
  }
  const atualizar = useCallback(() => {
    const r = relogio.current;
    setModo(r.modo);
    setFase(r.fase);
    setRodando(r.inicio !== null);
    setSegundos(
      Math.floor(
        r.modo === "livre"
          ? decorrido(r)
          : Math.max(
              0,
              (r.fase === "foco" ? FOCO_SEG : PAUSA_SEG) - decorrido(r),
            ),
      ),
    );
  }, [decorrido]);
  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo || !data.session) return;
      chave.current = `cronometro:${data.session.user.id}:${roteiroId ?? "livre"}:${topicoIndex ?? "livre"}`;
      try {
        const raw = localStorage.getItem(chave.current);
        if (raw) {
          const r = JSON.parse(raw);
          if (
            ["livre", "pomodoro"].includes(r.modo) &&
            ["foco", "pausa"].includes(r.fase) &&
            Number.isFinite(r.acumulado) &&
            r.acumulado >= 0 &&
            (r.inicio === null || Number.isFinite(r.inicio)) &&
            typeof r.sessaoId === "string"
          )
            relogio.current = r;
        }
      } catch {}
      setPronto(true);
      atualizar();
    });
    return () => {
      ativo = false;
    };
  }, [roteiroId, topicoIndex, atualizar]);
  const salvarSessao = useCallback(
    async (sec: number) => {
      if (sec < 5)
        throw new Error(
          "Estude pelo menos 5 segundos para registrar a sessão.",
        );
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session)
        throw new Error("Entre novamente para salvar a sessão.");
      const { error } = await supabase.from("sessoes").insert({
        id: relogio.current.sessaoId,
        user_id: auth.session.user.id,
        roteiro_id: roteiroId ?? null,
        topico_index: topicoIndex ?? null,
        segundos: Math.floor(sec),
      });
      if (error && error.code !== "23505") throw new Error(error.message);
    },
    [roteiroId, topicoIndex],
  );
  const processando = useRef(false);
  useEffect(() => {
    if (!pronto) return;
    const tick = async () => {
      atualizar();
      const r = relogio.current;
      if (
        !r.inicio ||
        r.modo !== "pomodoro" ||
        decorrido(r) < (r.fase === "foco" ? FOCO_SEG : PAUSA_SEG) ||
        processando.current
      )
        return;
      processando.current = true;
      const encerrada = r.fase;
      r.inicio = null;
      r.acumulado = encerrada === "foco" ? FOCO_SEG : PAUSA_SEG;
      persistir();
      atualizar();
      try {
        if (encerrada === "foco") await salvarSessao(FOCO_SEG);
        relogio.current = {
          ...r,
          fase: encerrada === "foco" ? "pausa" : "foco",
          inicio: null,
          acumulado: 0,
          sessaoId: crypto.randomUUID(),
        };
        setMsg(
          encerrada === "foco"
            ? "Foco registrado! Inicie a pausa quando quiser."
            : "Pausa concluída. Inicie o próximo foco.",
        );
      } catch (e) {
        setMsg(
          e instanceof Error
            ? e.message + " Clique em Finalizar para tentar novamente."
            : "Falha ao salvar.",
        );
      } finally {
        processando.current = false;
        persistir();
        atualizar();
      }
    };
    const timer = setInterval(tick, 250);
    tick();
    return () => clearInterval(timer);
  }, [pronto, atualizar, decorrido, salvarSessao]);
  function alternar() {
    if (!pronto || ocupado) return;
    const r = relogio.current;
    if (r.inicio) {
      r.acumulado = decorrido(r);
      r.inicio = null;
    } else r.inicio = Date.now();
    persistir();
    atualizar();
  }
  async function finalizarLivre() {
    if (ocupado) return;
    const r = relogio.current;
    r.acumulado = decorrido(r);
    r.inicio = null;
    persistir();
    atualizar();
    setOcupado(true);
    try {
      await salvarSessao(r.acumulado);
      setMsg(`Sessão de ${formatar(Math.floor(r.acumulado))} registrada!`);
      r.acumulado = 0;
      r.sessaoId = crypto.randomUUID();
      persistir();
      atualizar();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Falha ao salvar.");
    } finally {
      setOcupado(false);
    }
  }
  function trocarModo(novo: "livre" | "pomodoro") {
    if (!pronto || ocupado || processando.current) return;
    if (
      decorrido(relogio.current) > 0 &&
      !window.confirm("Descartar o tempo atual e trocar de modo?")
    )
      return;
    relogio.current = {
      modo: novo,
      fase: "foco",
      acumulado: 0,
      inicio: null,
      sessaoId: crypto.randomUUID(),
    };
    setMsg("");
    persistir();
    atualizar();
  }
  function resetar() {
    if (ocupado || !window.confirm("Descartar o tempo deste bloco?")) return;
    relogio.current = {
      ...relogio.current,
      acumulado: 0,
      inicio: null,
      fase: "foco",
      sessaoId: crypto.randomUUID(),
    };
    persistir();
    atualizar();
  }

  return (
    <div
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Spacebar") {
          e.preventDefault();
          alternar();
        }
      }}
      title="Dica: clique aqui e use a barra de espaço para iniciar/pausar"
      className="timer-card rounded-lg border border-slate-200 p-3 outline-none focus:ring-2 focus:ring-blue-400 dark:border-slate-700"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Tempo de estudo</h3>
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs dark:bg-slate-800">
          <button
            onClick={() => trocarModo("livre")}
            className={`rounded-md px-2 py-1 ${
              modo === "livre"
                ? "bg-white shadow dark:bg-slate-700"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Livre
          </button>
          <button
            onClick={() => trocarModo("pomodoro")}
            className={`rounded-md px-2 py-1 ${
              modo === "pomodoro"
                ? "bg-white shadow dark:bg-slate-700"
                : "text-slate-500 dark:text-slate-400"
            }`}
          >
            Pomodoro
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="font-mono text-3xl font-bold tabular-nums">
          {formatar(segundos)}
        </span>
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
            onClick={alternar}
            disabled={!pronto || ocupado}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            {rodando ? "Pausar" : "Iniciar"}
          </button>
          {modo === "livre" || (fase === "foco" && segundos === 0) ? (
            <button
              onClick={finalizarLivre}
              disabled={
                ocupado || !pronto || (modo === "livre" && segundos < 5)
              }
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

      {msg && (
        <p
          role="status"
          className="mt-2 text-xs text-green-600 dark:text-green-400"
        >
          {msg}
        </p>
      )}
    </div>
  );
}
