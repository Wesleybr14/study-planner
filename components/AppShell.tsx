"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";
import BottomNav from "@/components/BottomNav";

/** Itens de navegação comuns a todas as páginas internas. */
const NAV = [
  { href: "/cronometro", icone: "⏱", rotulo: "Foco" },
  { href: "/revisao", icone: "🔁", rotulo: "Revisar" },
  { href: "/estatisticas", icone: "📊", rotulo: "Progresso" },
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

  return (
    <div className="min-h-screen">
      {/* Barra lateral (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-200 bg-white px-3 py-4 md:flex dark:border-slate-800 dark:bg-slate-900">
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
      <div className="md:ml-64">
        {/* Barra de topo (celular) */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/90">
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
    </div>
  );
}
