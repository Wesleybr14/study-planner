"use client";

import { useRef, useState } from "react";
import LeitorArquivo from "@/components/LeitorArquivo";
import { TIPOS_ACEITOS, tamanhoLegivel, type Arquivo } from "@/lib/arquivos";

/** Operações de arquivos devolvidas por `useArquivos`. */
export type AcoesArquivos = {
  adicionar: (files: File[]) => Promise<string[]>;
  remover: (a: Arquivo) => Promise<void>;
  subir: (a: Arquivo) => Promise<void>;
  obterBlob: (a: Arquivo) => Promise<Blob>;
};

/** Botão que abre o seletor de arquivos do computador (PDF/EPUB). */
export function BotaoAdicionar({
  onArquivos,
  compacto = false,
}: {
  onArquivos: (files: File[]) => void;
  compacto?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={TIPOS_ACEITOS}
        multiple
        className="hidden"
        onChange={(e) => {
          const fs = Array.from(e.target.files ?? []);
          if (fs.length) onArquivos(fs);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => ref.current?.click()}
        title="Adicionar PDF/EPUB do computador"
        className="shrink-0 rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
      >
        {compacto ? "＋" : "＋ Adicionar do computador"}
      </button>
    </>
  );
}

/**
 * Seção "No seu computador": lista os arquivos (locais e na nuvem) de um tópico,
 * permite adicionar/abrir/remover e enviar para a nuvem. Apresentacional — os
 * dados vêm de `useArquivos` (chamado pelo componente pai).
 */
export default function SeletorArquivos({
  locais,
  nuvem,
  carregando,
  acoes,
  alturaLeitor = "26rem",
}: {
  locais: Arquivo[];
  nuvem: Arquivo[];
  carregando: boolean;
  acoes: AcoesArquivos;
  alturaLeitor?: string;
}) {
  const [aviso, setAviso] = useState("");
  const [aberto, setAberto] = useState<Arquivo | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);

  async function aoAdicionar(files: File[]) {
    setAviso("");
    const erros = await acoes.adicionar(files);
    if (erros.length) setAviso(erros.join(" "));
  }

  async function aoSubir(a: Arquivo) {
    setAviso("");
    setOcupado(a.id);
    try {
      await acoes.subir(a);
    } catch (e: any) {
      setAviso(
        e?.message ??
          "Falha ao salvar na nuvem. Você rodou a supabase-migration-6.sql?",
      );
    } finally {
      setOcupado(null);
    }
  }

  async function aoRemover(a: Arquivo) {
    if (!confirm(`Remover "${a.nome}"?`)) return;
    if (aberto?.id === a.id) setAberto(null);
    await acoes.remover(a);
  }

  const lista = (itens: Arquivo[], origem: "local" | "nuvem") =>
    itens.map((a) => {
      const ativo = aberto?.id === a.id;
      return (
        <li
          key={a.id}
          className="flex items-center gap-2 rounded-lg border border-slate-200 p-2 dark:border-slate-700"
        >
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm" title={a.nome}>
              {a.nome}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {tamanhoLegivel(a.tamanho)}
              {origem === "local" ? " · só neste navegador" : " · na nuvem"}
            </span>
          </span>
          <button
            type="button"
            onClick={() => setAberto(ativo ? null : a)}
            className="shrink-0 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {ativo ? "Fechar" : "Abrir"}
          </button>
          {origem === "local" && (
            <button
              type="button"
              onClick={() => aoSubir(a)}
              disabled={ocupado === a.id}
              title="Salvar na nuvem (ver em qualquer aparelho)"
              className="shrink-0 text-xs disabled:opacity-40"
            >
              {ocupado === a.id ? "⏳" : "☁️"}
            </button>
          )}
          <button
            type="button"
            onClick={() => aoRemover(a)}
            title="Remover"
            className="shrink-0 text-xs text-slate-400 hover:text-red-600 dark:hover:text-red-400"
          >
            🗑
          </button>
        </li>
      );
    });

  const vazio = !carregando && locais.length === 0 && nuvem.length === 0;

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">📁 No seu computador</p>
        <BotaoAdicionar onArquivos={aoAdicionar} />
      </div>

      {aberto && (
        <div style={{ height: alturaLeitor }}>
          <LeitorArquivo
            arquivo={aberto}
            obterBlob={acoes.obterBlob}
            className="h-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
          />
        </div>
      )}

      {carregando && (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Carregando arquivos…
        </p>
      )}

      {vazio && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Adicione um PDF ou EPUB que já esteja no seu PC. Ele fica salvo neste
          navegador; use ☁️ para ter em todos os aparelhos.
        </p>
      )}

      {locais.length > 0 && (
        <div className="space-y-1">
          {nuvem.length > 0 && (
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              Neste aparelho
            </p>
          )}
          <ul className="space-y-1">{lista(locais, "local")}</ul>
        </div>
      )}

      {nuvem.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            ☁️ Na nuvem
          </p>
          <ul className="space-y-1">{lista(nuvem, "nuvem")}</ul>
        </div>
      )}

      {aviso && (
        <p className="text-xs text-amber-600 dark:text-amber-400">{aviso}</p>
      )}
    </div>
  );
}
