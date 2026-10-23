"use client";

import Icon from "./Icon";
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
    tema === "system"
      ? "Sistema (segue SO)"
      : tema === "dark"
        ? "Modo escuro"
        : "Modo claro";
  return (
    <button
      onClick={alternar}
      title={rotulo}
      aria-label="Alternar tema"
      className="theme-toggle"
    >
      <Icon name={isDark ? "moon" : "sun"} size={17} />
      <span>
        {tema === "system"
          ? "Automático"
          : tema === "dark"
            ? "Escuro"
            : "Claro"}
      </span>
    </button>
  );
}
