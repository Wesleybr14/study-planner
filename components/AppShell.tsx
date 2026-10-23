"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";
import Icon, { Brand, type IconName } from "./Icon";
import { useDialog } from "./useDialog";
import BottomNav from "@/components/BottomNav";

/** Itens de navegação comuns a todas as páginas internas. */
const NAV: { href: string; icone: IconName; rotulo: string }[] = [
  { href: "/dashboard", icone: "home", rotulo: "Meus estudos" },
  { href: "/cronometro", icone: "clock", rotulo: "Tempo de foco" },
  { href: "/revisao", icone: "repeat", rotulo: "Revisão" },
  { href: "/estatisticas", icone: "chart", rotulo: "Meu progresso" },
  { href: "/configuracoes", icone: "settings", rotulo: "Configurações" },
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

  const container =
    largura === "foco" ? "max-w-2xl" : largura === "total" ? "" : "max-w-6xl";

  const [foco, setFoco] = useState(false);
  const [ajuda, setAjuda] = useState(false);
  const ajudaRef = useDialog<HTMLDivElement>(ajuda);

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
      if (digitando || alvo?.closest('[role="dialog"]')) return;
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

  const pagina = NAV.find((n) => ativo(n.href))?.rotulo ?? "Meu roteiro";
  return (
    <div className="study-shell">
      <a className="skip-link" href="#conteudo">
        Pular para o conteúdo
      </a>
      {!foco && (
        <aside className="study-sidebar">
          <Link href="/dashboard" aria-label="Study Planner — início">
            <Brand />
          </Link>
          <div className="sidebar-section-label">SEU ESPAÇO DE APRENDIZADO</div>
          <nav aria-label="Navegação principal" className="sidebar-nav">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                aria-current={ativo(n.href) ? "page" : undefined}
                className={`sidebar-link ${ativo(n.href) ? "is-active" : ""}`}
              >
                <Icon name={n.icone} />
                {n.rotulo}
                {ativo(n.href) && <span className="nav-dot" />}
              </Link>
            ))}
          </nav>
          <button className="sidebar-create" onClick={irParaNovo}>
            <Icon name="plus" size={18} /> Novo roteiro
          </button>
          <div className="sidebar-note">
            <Icon name="leaf" size={25} />
            <p>
              Um pouco por dia.
              <br />
              <strong>Um mundo de possibilidades.</strong>
            </p>
            <span>Respeite o seu ritmo.</span>
          </div>
          <div className="sidebar-tools">
            <button onClick={alternarFoco} title="Modo foco (F)">
              <Icon name="focus" size={18} /> Modo foco <kbd>F</kbd>
            </button>
            <button
              onClick={() => setAjuda(true)}
              title="Atalhos de teclado (?)"
            >
              <Icon name="keyboard" size={18} /> Atalhos <kbd>?</kbd>
            </button>
          </div>
          <div className="sidebar-footer">
            <ThemeToggle />
            <button
              onClick={sair}
              className="signout"
              aria-label="Sair da conta"
            >
              <Icon name="logout" size={18} />
            </button>
          </div>
        </aside>
      )}
      <div className={`study-content ${foco ? "focus-mode" : ""}`}>
        {!foco && (
          <header className="study-topbar">
            <Link href="/dashboard" className="mobile-brand">
              <Brand />
            </Link>
            <div className="topbar-breadcrumb">
              <span>Meu espaço</span>
              <span>/</span>
              <strong>{pagina}</strong>
            </div>
            <div className="topbar-right">
              <span className="topbar-motto">
                <span className="status-dot" /> Cada passo conta
              </span>
              <span className="mobile-theme">
                <ThemeToggle />
              </span>
              <button
                className="profile-mark"
                onClick={sair}
                title="Sair da conta"
                aria-label="Sair da conta"
              >
                <Icon name="leaf" size={19} />
              </button>
            </div>
          </header>
        )}
        <main
          id="conteudo"
          className={`study-main mx-auto w-full ${container}`}
          tabIndex={-1}
        >
          {children}
          <footer className="page-footer">
            <span>Aprender é uma jornada. Aproveite o caminho.</span>
            <span>Study Planner</span>
          </footer>
        </main>
      </div>
      {!foco && <BottomNav />}
      {foco && (
        <button onClick={alternarFoco} className="focus-exit">
          <Icon name="focus" size={18} /> Sair do foco <kbd>F</kbd>
        </button>
      )}
      {ajuda && (
        <div className="dialog-backdrop" onClick={() => setAjuda(false)}>
          <div
            ref={ajudaRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="atalhos-titulo"
            className="shortcut-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 id="atalhos-titulo">Atalhos para o seu ritmo</h2>
              <button
                onClick={() => setAjuda(false)}
                aria-label="Fechar atalhos"
              >
                <Icon name="close" />
              </button>
            </div>
            <ul>
              {[
                ["F", "Entrar ou sair do modo foco"],
                ["?", "Abrir os atalhos"],
                ["Esc", "Fechar painéis e ajuda"],
                ["Espaço", "Iniciar ou pausar o cronômetro em foco"],
              ].map(([key, desc]) => (
                <li key={key}>
                  <kbd>{key}</kbd>
                  <span>{desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
