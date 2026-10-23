"use client";

import Icon from "./Icon";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

/** Barra de navegação fixa no rodapé — só aparece no celular. */
export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  function irParaNovo() {
    if (pathname !== "/dashboard") {
      router.push("/dashboard#novo");
    } else {
      document.getElementById("novo")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  const item = (ativo: boolean) =>
    `mobile-nav-item ${ativo ? "is-active" : ""}`;

  return (
    <nav className="mobile-nav" aria-label="Navegação principal">
      <div className="mx-auto flex max-w-2xl">
        <Link href="/dashboard" className={item(pathname === "/dashboard")}>
          <Icon name="home" size={20} />
          Início
        </Link>
        <button onClick={irParaNovo} className={item(false)}>
          <Icon name="plus" size={20} />
          Novo
        </button>
        <Link href="/cronometro" className={item(pathname === "/cronometro")}>
          <Icon name="clock" size={20} />
          Foco
        </Link>
        <Link href="/revisao" className={item(pathname === "/revisao")}>
          <Icon name="repeat" size={20} />
          Revisar
        </Link>
        <Link
          href="/estatisticas"
          className={item(pathname === "/estatisticas")}
        >
          <Icon name="chart" size={20} />
          Progresso
        </Link>
      </div>
    </nav>
  );
}
