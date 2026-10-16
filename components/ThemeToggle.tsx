"use client";

import { useEffect, useState } from "react";

/** Botão para alternar entre claro e escuro. Preferência salva no navegador. */
export default function ThemeToggle() {
  const [tema, setTema] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTema(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  function alternar() {
    const novo = tema === "dark" ? "light" : "dark";
    setTema(novo);
    document.documentElement.classList.toggle("dark", novo === "dark");
    try {
      localStorage.theme = novo;
    } catch {}
  }

  return (
    <button
      onClick={alternar}
      title={tema === "dark" ? "Modo claro" : "Modo escuro"}
      aria-label="Alternar tema"
      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-base leading-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
    >
      {tema === "dark" ? "☀️" : "🌙"}
    </button>
  );
}
