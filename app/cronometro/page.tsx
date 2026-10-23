"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import AppShell from "@/components/AppShell";
import Cronometro from "@/components/Cronometro";

export default function Foco() {
  const router = useRouter();
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [roteiros, setRoteiros] = useState<any[]>([]);
  const [selecao, setSelecao] = useState(""); // "roteiroId:topicoIndex" ou "" (geral)

  const carregar = useCallback(async () => {
    const { data: auth } = await supabase.auth.getSession();
    if (!auth.session) return router.replace("/login");

    const { data, error } = await supabase
      .from("roteiros")
      .select("id, tema, topicos");
    if (error) setErro(error.message);
    setRoteiros(data ?? []);
    setCarregando(false);
  }, [router]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const [rid, ti] = selecao ? selecao.split(":") : [undefined, undefined];

  return (
    <AppShell largura="foco">
      {erro && (
        <p role="alert">
          Não foi possível carregar os dados: {erro}{" "}
          <button onClick={carregar}>Tentar novamente</button>
        </p>
      )}
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Um tempo para focar</h1>
      </header>

      {carregando ? (
        <p className="text-slate-500 dark:text-slate-400">Carregando...</p>
      ) : (
        <>
          <label
            htmlFor="foco-topico"
            className="mb-1 block text-sm text-slate-600 dark:text-slate-300"
          >
            O que você está estudando? (opcional)
          </label>
          <select
            id="foco-topico"
            value={selecao}
            onChange={(e) => setSelecao(e.target.value)}
            className="mb-6 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="">Tempo geral (sem tópico)</option>
            {roteiros.map((r) => (
              <optgroup key={r.id} label={r.tema}>
                {(r.topicos ?? []).map((t: any, i: number) => (
                  <option key={i} value={`${r.id}:${t.recursoIndex ?? i}`}>
                    {t.titulo}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          <Cronometro
            key={selecao}
            roteiroId={rid}
            topicoIndex={ti !== undefined ? Number(ti) : undefined}
          />

          <p className="mt-4 text-center text-xs text-slate-400 dark:text-slate-500">
            O tempo registrado aqui aparece na página 📊 Progresso.
          </p>
        </>
      )}
    </AppShell>
  );
}
