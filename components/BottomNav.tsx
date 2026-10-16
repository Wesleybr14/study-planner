"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/** Barra de navegação fixa no rodapé — só aparece no celular. */
export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  function irParaNovo() {
    if (pathname !== "/dashboard") {
      router.push("/dashboard");
    } else {
      document.getElementById("novo")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  const item = (ativo: boolean) =>
    `flex-1 py-3 text-center text-xs ${ativo ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400"}`;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur md:hidden dark:border-slate-800 dark:bg-slate-900/95">
      <div className="mx-auto flex max-w-2xl">
        <Link href="/dashboard" className={item(pathname === "/dashboard")}>
          <div className="text-lg">🏠</div>
          Início
        </Link>
        <button onClick={irParaNovo} className={item(false)}>
          <div className="text-lg">➕</div>
          Novo
        </button>
        <Link href="/cronometro" className={item(pathname === "/cronometro")}>
          <div className="text-lg">⏱</div>
          Foco
        </Link>
        <Link href="/revisao" className={item(pathname === "/revisao")}>
          <div className="text-lg">🔁</div>
          Revisar
        </Link>
        <Link href="/estatisticas" className={item(pathname === "/estatisticas")}>
          <div className="text-lg">📊</div>
          Progresso
        </Link>
      </div>
    </nav>
  );
}
