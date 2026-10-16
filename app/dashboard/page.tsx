"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { labelPrazo, corPrazo, formatarData } from "@/lib/prazo";
import ThemeToggle from "@/components/ThemeToggle";
import BottomNav from "@/components/BottomNav";

type Roteiro = {
  id: string;
  tema: string;
  descricao: string;
  topicos: any[];
  progresso: number;
  prazo: string | null;
  criado_em: string;
};

export default function Dashboard() {
  const router = useRouter();
  const [tema, setTema] = useState("");
  const [prazo, setPrazo] = useState("");
  const [gerando, setGerando] = useState(false);
  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);
  const [erro, setErro] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
    });
    carregarRoteiros();
  }, [router]);

  async function carregarRoteiros() {
    const { data } = await supabase
      .from("roteiros")
      .select("*")
      .order("criado_em", { ascending: false });
    setRoteiros(data ?? []);
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!tema.trim()) return;
    setGerando(true);
    setErro("");

    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tema }),
      });
      const plano = await res.json();
      if (!res.ok) throw new Error(plano.erro ?? "Erro ao gerar");

      const { data: auth } = await supabase.auth.getSession();
      const userId = auth.session?.user.id;

      await supabase.from("roteiros").insert({
        user_id: userId,
        tema: plano.tema,
        descricao: plano.descricao,
        topicos: plano.topicos,
        progresso: 0,
        prazo: prazo || null,
      });

      setTema("");
      setPrazo("");
      carregarRoteiros();
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setGerando(false);
    }
  }

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <main className="mx-auto max-w-2xl p-6 pb-24 md:pb-6">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">📚 Meus estudos</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button onClick={sair} className="text-sm text-slate-500 hover:text-red-500 dark:text-slate-400">
            Sair
          </button>
        </div>
      </header>

      <form onSubmit={criar} id="novo" className="mb-8 rounded-2xl bg-white p-6 shadow dark:border dark:border-slate-800 dark:bg-slate-900">
        <label className="mb-2 block font-medium">Sobre o que você quer estudar?</label>
        <input
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          placeholder="Ex: Inteligência Artificial, Finanças, Inglês..."
          className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <div className="mb-3">
          <label className="mb-1 block text-sm text-slate-600 dark:text-slate-300">
            Meta (opcional) — até quando quer terminar?
          </label>
          <input
            type="date"
            value={prazo}
            onChange={(e) => setPrazo(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          />
        </div>
        <button
          type="submit"
          disabled={gerando}
          className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {gerando ? "Gerando..." : "Gerar roteiro"}
        </button>
        {gerando && <p className="mt-2 text-sm text-slate-500">A IA está montando seu plano de estudos...</p>}
        {erro && <p className="mt-2 text-sm text-red-500">{erro}</p>}
      </form>

      <div className="space-y-3">
        {roteiros.length === 0 && (
          <p className="text-center text-slate-400 dark:text-slate-500">Nenhum roteiro ainda. Crie o primeiro acima!</p>
        )}
        {roteiros.map((r) => (
          <button
            key={r.id}
            onClick={() => router.push(`/tema/${r.id}`)}
            className="block w-full rounded-xl bg-white p-4 text-left shadow hover:shadow-md dark:border dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{r.tema}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">{r.progresso}%</span>
            </div>
            {r.prazo && (
              <p className={`mt-1 text-xs ${corPrazo(r.prazo)}`}>
                🎯 {labelPrazo(r.prazo)} · meta {formatarData(r.prazo)}
              </p>
            )}
            <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-2 rounded-full bg-green-500" style={{ width: `${r.progresso}%` }} />
            </div>
          </button>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
