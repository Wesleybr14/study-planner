"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { labelPrazo, corPrazo, formatarData } from "@/lib/prazo";
import ThemeToggle from "@/components/ThemeToggle";
import BottomNav from "@/components/BottomNav";

type Flashcard = { frente: string; verso: string };

type Topico = {
  titulo: string;
  nivel: string;
  descricao: string;
  duracaoEstimada: string;
  buscaVideos: string;
  buscaLivros: string;
  nota?: string;
  flashcards?: Flashcard[];
};

export default function TemaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [roteiro, setRoteiro] = useState<any>(null);
  const [concluidos, setConcluidos] = useState<boolean[]>([]);
  const [aberto, setAberto] = useState<number | null>(null);
  const [videos, setVideos] = useState<Record<number, any[]>>({});
  const [livros, setLivros] = useState<Record<number, any[]>>({});
  const [notas, setNotas] = useState<Record<number, string>>({});
  const [gerandoFlash, setGerandoFlash] = useState<Record<number, boolean>>({});
  const [virados, setVirados] = useState<Record<string, boolean>>({});

  useEffect(() => {
    carregar();
  }, [id]);

  async function carregar() {
    const { data } = await supabase.from("roteiros").select("*").eq("id", id).single();
    if (!data) return router.replace("/dashboard");
    setRoteiro(data);
    setConcluidos(data.topicos.map((t: any) => !!t.concluido));
    const n: Record<number, string> = {};
    data.topicos.forEach((t: any, i: number) => (n[i] = t.nota ?? ""));
    setNotas(n);
  }

  async function salvarTopicos(topicos: any[]) {
    setRoteiro((r: any) => ({ ...r, topicos }));
    await supabase.from("roteiros").update({ topicos }).eq("id", id);
  }

  async function alternar(i: number) {
    const novos = [...concluidos];
    novos[i] = !novos[i];
    setConcluidos(novos);

    const topicos = roteiro.topicos.map((t: any, idx: number) => ({ ...t, concluido: novos[idx] }));
    const progresso = Math.round((novos.filter(Boolean).length / novos.length) * 100);

    await supabase.from("roteiros").update({ topicos, progresso }).eq("id", id);
    setRoteiro({ ...roteiro, topicos, progresso });
  }

  async function abrir(i: number) {
    if (aberto === i) {
      setAberto(null);
      return;
    }
    setAberto(i);
    if (!videos[i]) {
      const t = roteiro.topicos[i];
      const [v, l] = await Promise.all([
        fetch(`/api/search-videos?q=${encodeURIComponent(t.buscaVideos ?? t.titulo)}`).then((r) => r.json()),
        fetch(`/api/search-books?q=${encodeURIComponent(t.buscaLivros ?? t.titulo)}`).then((r) => r.json()),
      ]);
      setVideos((prev) => ({ ...prev, [i]: v }));
      setLivros((prev) => ({ ...prev, [i]: l }));
    }
  }

  async function salvarNota(i: number) {
    const topicos = roteiro.topicos.map((t: any, idx: number) =>
      idx === i ? { ...t, nota: notas[i] ?? "" } : t
    );
    await salvarTopicos(topicos);
  }

  async function gerarFlashcards(i: number) {
    setGerandoFlash((p) => ({ ...p, [i]: true }));
    try {
      const t = roteiro.topicos[i];
      const res = await fetch("/api/generate-flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo: t.titulo, descricao: t.descricao }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro ao gerar");
      const topicos = roteiro.topicos.map((tp: any, idx: number) =>
        idx === i ? { ...tp, flashcards: data.flashcards } : tp
      );
      await salvarTopicos(topicos);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setGerandoFlash((p) => ({ ...p, [i]: false }));
    }
  }

  if (!roteiro) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="text-slate-500 dark:text-slate-400">Carregando...</p>
      </main>
    );
  }

  const progresso = Math.round((concluidos.filter(Boolean).length / concluidos.length) * 100);

  return (
    <main className="mx-auto max-w-2xl p-6 pb-24 md:pb-6">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={() => router.push("/dashboard")} className="text-sm text-blue-600 hover:underline dark:text-blue-400">
          ← Voltar
        </button>
        <ThemeToggle />
      </div>

      <h1 className="text-2xl font-bold">{roteiro.tema}</h1>
      <p className="mb-2 text-slate-500 dark:text-slate-400">{roteiro.descricao}</p>

      {roteiro.prazo && (
        <p className={`mb-4 text-sm font-medium ${corPrazo(roteiro.prazo)}`}>
          🎯 Meta: {formatarData(roteiro.prazo)} · {labelPrazo(roteiro.prazo)}
        </p>
      )}

      <div className="mb-6">
        <div className="mb-1 flex justify-between text-sm">
          <span>Progresso</span>
          <span>{progresso}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-2 rounded-full bg-green-500 transition-all" style={{ width: `${progresso}%` }} />
        </div>
      </div>

      <div className="space-y-3">
        {roteiro.topicos.map((t: Topico, i: number) => (
          <div key={i} className="rounded-xl bg-white shadow dark:border dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-start gap-3 p-4">
              <input
                type="checkbox"
                checked={concluidos[i]}
                onChange={() => alternar(i)}
                className="mt-1 h-5 w-5 cursor-pointer accent-green-500"
              />
              <div className="flex-1 cursor-pointer" onClick={() => abrir(i)}>
                <div className="flex items-center gap-2">
                  <span className={`font-semibold ${concluidos[i] ? "text-slate-400 line-through dark:text-slate-500" : ""}`}>
                    {i + 1}. {t.titulo}
                  </span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                    {t.nivel}
                  </span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t.descricao}</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
                  ⏱ {t.duracaoEstimada}
                  {t.nota ? " · 📝 com anotação" : ""}
                  {t.flashcards?.length ? ` · 🃏 ${t.flashcards.length} flashcards` : ""}
                </p>
              </div>
            </div>

            {aberto === i && (
              <div className="space-y-4 border-t p-4 dark:border-slate-800">
                <div>
                  <h3 className="mb-2 text-sm font-semibold">🎬 Vídeos</h3>
                  <div className="grid gap-2">
                    {(videos[i] ?? []).map((v: any, k: number) => (
                      <a
                        key={k}
                        href={v.url}
                        target="_blank"
                        className="flex gap-3 rounded-lg bg-slate-50 p-2 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                      >
                        {v.thumbnail && <img src={v.thumbnail} alt="" className="h-16 w-28 rounded object-cover" />}
                        <div>
                          <p className="text-sm font-medium">{v.titulo}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{v.canal}</p>
                        </div>
                      </a>
                    ))}
                    {videos[i]?.length === 0 && (
                      <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum vídeo encontrado.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">📖 Livros</h3>
                  <div className="grid gap-2">
                    {(livros[i] ?? []).map((l: any, k: number) => (
                      <a
                        key={k}
                        href={l.url}
                        target="_blank"
                        className="flex gap-3 rounded-lg bg-slate-50 p-2 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700"
                      >
                        {l.capa && <img src={l.capa} alt="" className="h-16 w-12 rounded object-cover" />}
                        <div>
                          <p className="text-sm font-medium">{l.titulo}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{l.autores}</p>
                        </div>
                      </a>
                    ))}
                    {livros[i]?.length === 0 && (
                      <p className="text-sm text-slate-400 dark:text-slate-500">Nenhum livro encontrado.</p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">📝 Minhas anotações</h3>
                  <textarea
                    value={notas[i] ?? ""}
                    onChange={(e) => setNotas((p) => ({ ...p, [i]: e.target.value }))}
                    onBlur={() => salvarNota(i)}
                    rows={3}
                    placeholder="Escreva aqui o que aprendeu, dúvidas, links..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <h3 className="text-sm font-semibold">🃏 Flashcards de revisão</h3>
                    <button
                      onClick={() => gerarFlashcards(i)}
                      disabled={gerandoFlash[i]}
                      className="rounded-lg bg-purple-600 px-3 py-1 text-xs font-medium text-white hover:bg-purple-700 disabled:opacity-50"
                    >
                      {gerandoFlash[i] ? "Gerando..." : t.flashcards?.length ? "Gerar novamente" : "Gerar flashcards"}
                    </button>
                  </div>
                  <div className="grid gap-2">
                    {(t.flashcards ?? []).map((f, k) => {
                      const chave = `${i}-${k}`;
                      return (
                        <button
                          key={k}
                          onClick={() => setVirados((p) => ({ ...p, [chave]: !p[chave] }))}
                          className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-left text-sm hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-900/40 dark:hover:bg-purple-900/60"
                        >
                          <p className="font-medium">{f.frente}</p>
                          <p className={`mt-1 ${virados[chave] ? "text-purple-700 dark:text-purple-300" : "text-slate-400 dark:text-slate-500"}`}>
                            {virados[chave] ? f.verso : "▶ Clique para ver a resposta"}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <BottomNav />
    </main>
  );
}
