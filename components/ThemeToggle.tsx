"use client";

import { useEffect, useState } from "react";

/** Botão para alternar entre claro/escuro/sistema. Preferência salva no navegador. */
type Tema = "light" | "dark" | "system";

export default function ThemeToggle() {
  const [tema, setTema] = useState<Tema>("system");
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    try {
      const t = (localStorage.getItem("theme") as Tema) || "system";
      aplicar(t);
    } catch {
      aplicar("system");
    }

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if ((localStorage.getItem("theme") as Tema) !== "system") return;
      setIsDark(mq.matches);
      document.documentElement.classList.toggle("dark", mq.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function aplicar(t: Tema) {
    setTema(t);
    try {
      localStorage.setItem("theme", t);
    } catch {}

    if (t === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      setIsDark(mq.matches);
      document.documentElement.classList.toggle("dark", mq.matches);
      return;
    }

    const d = t === "dark";
    setIsDark(d);
    document.documentElement.classList.toggle("dark", d);
  }

  function alternar() {
    if (tema === "system") aplicar("light");
    else if (tema === "light") aplicar("dark");
    else aplicar("system");
  }

  const rotulo =
    tema === "system" ? "Sistema (segue SO)" : tema === "dark" ? "Modo escuro" : "Modo claro";
  const icone = tema === "system" ? (isDark ? "🌙" : "☀️") : tema === "dark" ? "🌙" : "☀️";

  return (
    <button
      onClick={alternar}
      title={rotulo}
      aria-label="Alternar tema"
      className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-base leading-none hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
    >
      {icone} <span className="ml-1 hidden sm:inline text-xs">{tema}</span>
    </button>
  );
}
