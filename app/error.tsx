"use client";

import { useEffect } from "react";
import Link from "next/link";

// Tela mostrada quando uma página quebra ao renderizar (em vez da tela padrão do Next).
export default function Erro({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Algo deu errado nesta página.</h1>
      <p className="text-slate-500">
        Suas anotações já salvas não foram afetadas. Tente carregar de novo.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => retry()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Tentar novamente
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg px-4 py-2 text-sm font-medium text-blue-600 hover:underline"
        >
          Voltar ao painel
        </Link>
      </div>
    </main>
  );
}
