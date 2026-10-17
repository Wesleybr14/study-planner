"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";
import BottomNav from "@/components/BottomNav";

/** Itens de navegação comuns a todas as páginas internas. */
const NAV = [
  { href: "/cronometro", icone: "⏱", rotulo: "Foco" },
  { href: "/revisao", icone: "🔁", rotulo: "Revisar" },
  { href: "/estatisticas", icone: "📊", rotulo: "Progresso" },
  { href: "/configuracoes", icone: "⚙️", rotulo: "Ajustes" },
];

/**
 * Estrutura base das telas internas: barra lateral fixa no desktop,
 * barra de topo + navegação inferior no celular. O conteúdo ocupa o
 * restante da largura disponível.
 */
export default function AppShell({
  children,
  largura = "larga",
}: {
  children: React.ReactNode;
  largura?: "larga" | "foco" | "total";
}) {
  const pathname = usePathname();
  const router = useRouter();

  function ativo(href: string) {
    if (href === "/dashboard")
      return pathname === "/dashboard" || pathname.startsWith("/tema");
    return pathname.startsWith(href);
  }

  function irParaNovo() {
    if (pathname === "/dashboard") {
      document.getElementById("novo")?.scrollIntoView({ behavior: "smooth" });
    } else {
      router.push("/dashboard#novo");
    }
  }

  async function sair() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  const base =
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition";
  const itemAtivo =
    "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  const itemInativo =
    "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800";
  const container =
    largura === "foco" ? "max-w-2xl" : largura === "total" ? "" : "max-w-6xl";

  const [foco, setFoco] = useState(false);
  const [ajuda, setAjuda] = useState(false);

  // Lê a preferência de modo foco salva.
  useEffect(() => {
    try {
      setFoco(localStorage.getItem("foco") === "1");
    } catch {}
  }, []);

  function alternarFoco() {
    setFoco((f) => {
      const novo = !f;
      try {
        localStorage.setItem("foco", novo ? "1" : "0");
      } catch {}
      return novo;
    });
  }

  // Atalhos globais: F (foco), ? (ajuda), Esc fecha a ajuda.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const alvo = e.target as HTMLElement;
      const digitando =
        alvo &&
        (alvo.tagName === "INPUT" ||
          alvo.tagName === "TEXTAREA" ||
          alvo.isContentEditable);
      if (digitando) return;
      if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        alternarFoco();
      } else if (e.key === "?") {
        e.preventDefault();
        setAjuda((a) => !a);
      } else if (e.key === "Escape") {
        setAjuda(false);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen">
      {/* Barra lateral (desktop) */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white px-3 py-4 md:flex dark:border-slate-800 dark:bg-slate-900 ${
          foco ? "md:hidden" : ""
        }`}
      >
        <Link href="/dashboard" className="mb-6 px-2 text-lg font-bold">
          📚 Study Planner
        </Link>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
          <Link
            href="/dashboard"
            className={`${base} ${ativo("/dashboard") ? itemAtivo : itemInativo}`}
          >
            <span className="text-base">🏠</span> Início
          </Link>

          <button onClick={irParaNovo} className={`${base} ${itemInativo}`}>
            <span className="text-base">➕</span> Novo
          </button>

          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`${base} ${ativo(n.href) ? itemAtivo : itemInativo}`}
            >
              <span className="text-base">{n.icone}</span> {n.rotulo}
            </Link>
          ))}
        </nav>

        <button
          onClick={alternarFoco}
          className={`${base} ${itemInativo}`}
          title="Modo foco (F) — esconde o menu"
        >
          <span className="text-base">🎯</span> Modo foco
        </button>
        <button
          onClick={() => setAjuda(true)}
          className={`${base} ${itemInativo}`}
          title="Atalhos de teclado (?)"
        >
          <span className="text-base">⌨️</span> Atalhos
        </button>

        <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4 dark:border-slate-800">
          <ThemeToggle />
          <button
            onClick={sair}
            className="text-sm text-slate-500 hover:text-red-500 dark:text-slate-400"
          >
            Sair
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className={foco ? "" : "md:ml-64"}>
        {/* Barra de topo (celular) */}
        <header
          className={`sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/90 ${
            foco ? "hidden" : ""
          }`}
        >
          <Link href="/dashboard" className="font-bold">
            📚 Study Planner
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <button
              onClick={sair}
              className="text-sm text-slate-500 hover:text-red-500 dark:text-slate-400"
            >
              Sair
            </button>
          </div>
        </header>

        <main className={`mx-auto w-full ${container} p-6 pb-24 md:pb-6`}>
          {children}
        </main>
      </div>

      <BottomNav />

      {/* Botão flutuante para sair do modo foco */}
      {foco && (
        <button
          onClick={alternarFoco}
          title="Sair do modo foco (F)"
          className="fixed bottom-4 right-4 z-40 rounded-full bg-slate-900/80 px-3 py-2 text-sm text-white shadow-lg backdrop-blur hover:bg-slate-900 dark:bg-white/80 dark:text-slate-900"
        >
          🎯 Sair do foco
        </button>
      )}

      {/* Ajuda de atalhos */}
      {ajuda && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setAjuda(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl dark:border dark:border-slate-800 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold">⌨️ Atalhos de teclado</h2>
              <button
                onClick={() => setAjuda(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                ✕
              </button>
            </div>
            <ul className="space-y-2 text-sm">
              {[
                ["F", "Modo foco (esconde o menu)"],
                ["?", "Mostrar/ocultar esta ajuda"],
                ["Esc", "Fechar painel, workspace ou ajuda"],
                ["Espaço", "Iniciar/pausar o cronômetro (com ele em foco)"],
              ].map(([tecla, desc]) => (
                <li key={tecla} className="flex items-center gap-3">
                  <kbd className="rounded border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-medium dark:border-slate-600 dark:bg-slate-800">
                    {tecla}
                  </kbd>
                  <span className="text-slate-600 dark:text-slate-300">
                    {desc}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
