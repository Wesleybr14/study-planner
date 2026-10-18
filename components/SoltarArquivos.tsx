"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Área que aceita **arrastar-e-soltar** arquivos do computador (PDF/EPUB).
 * Enquanto o arquivo está sobre a área, mostra uma sobreposição de "solte aqui".
 * Também impede que um arquivo solto fora da área faça o navegador abri-lo
 * (o que descartaria o estado da página).
 */
export function AreaSoltar({
  onArquivos,
  className = "",
  children,
}: {
  onArquivos: (files: File[]) => void;
  className?: string;
  children: React.ReactNode;
}) {
  const [sobre, setSobre] = useState(false);
  const contador = useRef(0);

  // Evita que soltar um arquivo fora de uma área abra/baixe no navegador.
  useEffect(() => {
    const previne = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes("Files")) e.preventDefault();
    };
    window.addEventListener("dragover", previne);
    window.addEventListener("drop", previne);
    return () => {
      window.removeEventListener("dragover", previne);
      window.removeEventListener("drop", previne);
    };
  }, []);

  return (
    <div
      onDragEnter={(e) => {
        e.preventDefault();
        contador.current += 1;
        setSobre(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        e.preventDefault();
        contador.current -= 1;
        if (contador.current <= 0) {
          contador.current = 0;
          setSobre(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        contador.current = 0;
        setSobre(false);
        const arquivos = Array.from(e.dataTransfer?.files ?? []);
        if (arquivos.length) onArquivos(arquivos);
      }}
      className={`relative ${className}`}
    >
      {children}
      {sobre && (
        <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-xl border-2 border-dashed border-blue-500 bg-blue-50/85 p-2 text-center text-sm font-semibold text-blue-700 dark:bg-blue-950/80 dark:text-blue-200">
          Solte o PDF/EPUB aqui
        </div>
      )}
    </div>
  );
}
