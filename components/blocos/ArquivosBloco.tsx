"use client";

import { useState } from "react";
import SeletorArquivos, { Aviso } from "@/components/SeletorArquivos";
import { AreaSoltar } from "@/components/SoltarArquivos";
import { useArquivos } from "@/components/useArquivos";

type Acao = { adicionar: (files: File[]) => Promise<string[]> };

/**
 * Bloco "📁 Meus arquivos": reúne, num só lugar, todos os PDFs/EPUBs que o
 * usuário adicionou ao tópico — livros e artigos — com abrir/remover/enviar
 * para a nuvem. Cada seção aceita arrastar-e-soltar arquivos do computador.
 */
export default function ArquivosBloco({
  roteiroId,
  indice,
}: {
  roteiroId: string;
  indice: number;
}) {
  const livro = useArquivos(roteiroId, indice, "livro");
  const artigo = useArquivos(roteiroId, indice, "artigo");
  const [aviso, setAviso] = useState("");

  async function soltar(files: File[], arq: Acao) {
    setAviso("");
    const erros = await arq.adicionar(files);
    if (erros.length) setAviso(erros.join(" "));
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto">
      <AreaSoltar onArquivos={(f) => void soltar(f, livro)}>
        <SeletorArquivos
          locais={livro.locais}
          nuvem={livro.nuvem}
          carregando={livro.carregando}
          acoes={livro}
          titulo="📖 Livros que eu adicionei"
          alturaLeitor="24rem"
          onAviso={setAviso}
        />
      </AreaSoltar>

      <AreaSoltar onArquivos={(f) => void soltar(f, artigo)}>
        <SeletorArquivos
          locais={artigo.locais}
          nuvem={artigo.nuvem}
          carregando={artigo.carregando}
          acoes={artigo}
          titulo="🔬 Artigos que eu adicionei"
          alturaLeitor="24rem"
          onAviso={setAviso}
        />
      </AreaSoltar>

      <Aviso texto={aviso} />
    </div>
  );
}
