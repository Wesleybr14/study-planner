"use client";

import { useCallback, useEffect, useState } from "react";
import {
  TAMANHO_MAX,
  baixarNuvem,
  enviarParaNuvem,
  listarLocais,
  listarNuvem,
  removerLocal,
  removerNuvem,
  salvarLocal,
  tamanhoLegivel,
  type Arquivo,
  type TipoArquivo,
} from "@/lib/arquivos";

/**
 * Arquivos (PDF/EPUB) de um tópico, juntando os locais (IndexedDB) e os da
 * nuvem (Supabase Storage), com operações de adicionar/remover/subir.
 */
export function useArquivos(
  roteiroId: string,
  indice: number,
  tipo: TipoArquivo,
) {
  const [locais, setLocais] = useState<Arquivo[]>([]);
  const [nuvem, setNuvem] = useState<Arquivo[]>([]);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    setCarregando(true);
    const [l, n] = await Promise.all([
      listarLocais(roteiroId, indice, tipo),
      listarNuvem(roteiroId, indice, tipo).catch(() => [] as Arquivo[]),
    ]);
    setLocais(l);
    setNuvem(n);
    setCarregando(false);
  }, [roteiroId, indice, tipo]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

  /** Salva arquivos escolhidos no computador. Devolve mensagens de erro. */
  const adicionar = useCallback(
    async (files: File[]): Promise<string[]> => {
      const erros: string[] = [];
      for (const f of files) {
        if (f.size > TAMANHO_MAX) {
          erros.push(
            `"${f.name}" é grande demais (${tamanhoLegivel(f.size)}).`,
          );
          continue;
        }
        try {
          await salvarLocal(roteiroId, indice, tipo, f);
        } catch {
          erros.push(`Não foi possível guardar "${f.name}".`);
        }
      }
      await recarregar();
      return erros;
    },
    [roteiroId, indice, tipo, recarregar],
  );

  const remover = useCallback(
    async (arquivo: Arquivo) => {
      if (arquivo.origem === "local") await removerLocal(arquivo.id);
      else await removerNuvem(arquivo).catch(() => {});
      await recarregar();
    },
    [recarregar],
  );

  /** Envia um arquivo local para a nuvem e remove a cópia local. */
  const subir = useCallback(
    async (arquivo: Arquivo) => {
      const blob = arquivo.blob;
      if (!blob) return;
      await enviarParaNuvem(
        roteiroId,
        indice,
        tipo,
        arquivo.nome,
        arquivo.mime,
        blob,
      );
      await removerLocal(arquivo.id);
      await recarregar();
    },
    [roteiroId, indice, tipo, recarregar],
  );

  /** Devolve o conteúdo do arquivo (local direto; nuvem baixa na hora). */
  const obterBlob = useCallback(async (arquivo: Arquivo): Promise<Blob> => {
    if (arquivo.blob) return arquivo.blob;
    if (arquivo.storagePath) return await baixarNuvem(arquivo.storagePath);
    throw new Error("Arquivo indisponível.");
  }, []);

  return {
    locais,
    nuvem,
    itens: [...locais, ...nuvem],
    carregando,
    adicionar,
    remover,
    subir,
    obterBlob,
    recarregar,
  };
}
