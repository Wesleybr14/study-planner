"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { labelPrazo, corPrazo, formatarData } from "@/lib/prazo";
import { estaVencido } from "@/lib/revisao";
import AppShell from "@/components/AppShell";

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

    // Permite chegar no formulário via /dashboard#novo (ex.: botão "Novo").
    if (window.location.hash === "#novo") {
      setTimeout(
        () =>
          document
            .getElementById("novo")
            ?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    }
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

  const revisoesPendentes = roteiros.reduce(
    (acc, r) =>
      acc +
      (r.topicos ?? []).reduce(
        (a: number, t: any) =>
          a +
          (t.flashcards ?? []).filter((f: any) =>
            estaVencido({
              ease: f.ease ?? 2.5,
              intervalo: f.intervalo ?? 0,
              reps: f.reps ?? 0,
              proxima: f.proxima ?? null,
            }),
          ).length,
        0,
      ),
    0,
  );

  return (
    <AppShell>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">📚 Meus estudos</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Crie roteiros com IA e acompanhe seu progresso.
        </p>
      </header>

      {revisoesPendentes > 0 && (
        <Link
          href="/revisao"
          className="mb-6 flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50 p-4 text-sm hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-900/30 dark:hover:bg-purple-900/50"
        >
          <span className="font-medium text-purple-800 dark:text-purple-200">
            🔁 {revisoesPendentes} {revisoesPendentes === 1 ? "card" : "cards"}{" "}
            para revisar hoje
          </span>
          <span className="text-purple-700 dark:text-purple-300">
            Revisar →
          </span>
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <form
          onSubmit={criar}
          id="novo"
          className="h-fit rounded-2xl bg-white p-6 shadow lg:sticky lg:top-6 lg:col-span-1 dark:border dark:border-slate-800 dark:bg-slate-900"
        >
          <label className="mb-2 block font-medium">
            Sobre o que você quer estudar?
          </label>
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
          {gerando && (
            <p className="mt-2 text-sm text-slate-500">
              A IA está montando seu plano de estudos...
            </p>
          )}
          {erro && <p className="mt-2 text-sm text-red-500">{erro}</p>}
        </form>

        <section className="lg:col-span-2">
          {roteiros.length === 0 ? (
            <p className="rounded-xl bg-white p-8 text-center text-slate-400 shadow dark:border dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
              Nenhum roteiro ainda. Crie o primeiro ao lado!
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {roteiros.map((r) => (
                <button
                  key={r.id}
                  onClick={() => router.push(`/tema/${r.id}`)}
                  className="block w-full rounded-xl bg-white p-4 text-left shadow hover:shadow-md dark:border dark:border-slate-800 dark:bg-slate-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{r.tema}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {r.progresso}%
                    </span>
                  </div>
                  {r.prazo && (
                    <p className={`mt-1 text-xs ${corPrazo(r.prazo)}`}>
                      🎯 {labelPrazo(r.prazo)} · meta {formatarData(r.prazo)}
                    </p>
                  )}
                  <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${r.progresso}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
