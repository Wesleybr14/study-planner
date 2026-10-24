"use client";

import { useRef, useState } from "react";
import LeitorArquivo from "@/components/LeitorArquivo";
import {
  TIPOS_ACEITOS,
  formatoDe,
  tamanhoLegivel,
  type Arquivo,
} from "@/lib/arquivos";

/** Operações de arquivos devolvidas por `useArquivos`. */
export type AcoesArquivos = {
  adicionar: (files: File[]) => Promise<string[]>;
  remover: (a: Arquivo) => Promise<void>;
  removerVarios: (as: Arquivo[]) => Promise<void>;
  renomear: (a: Arquivo, nome: string) => Promise<void>;
  baixar: (a: Arquivo) => Promise<void>;
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

/** Mensagem de aviso/erro dos arquivos (renderizada pelo componente pai). */
export function Aviso({ texto }: { texto: string }) {
  if (!texto) return null;
  return <p className="text-xs text-amber-600 dark:text-amber-400">{texto}</p>;
}

const botaoIcone =
  "shrink-0 rounded px-1 text-xs text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-40 dark:hover:bg-slate-700 dark:hover:text-slate-200";

/**
 * Seção de arquivos de um tópico: lista os locais (IndexedDB) e os da nuvem
 * (Supabase Storage), permitindo abrir, renomear, baixar, remover, enviar para
 * a nuvem e excluir em lote. Apresentacional — os dados vêm de `useArquivos`
 * (chamado pelo componente pai).
 */
export default function SeletorArquivos({
  locais,
  nuvem,
  carregando,
  acoes,
  alturaLeitor = "26rem",
  titulo = "📁 No seu computador",
  onAviso,
}: {
  locais: Arquivo[];
  nuvem: Arquivo[];
  carregando: boolean;
  acoes: AcoesArquivos;
  alturaLeitor?: string;
  titulo?: string;
  onAviso: (mensagem: string) => void;
}) {
  const [aberto, setAberto] = useState<Arquivo | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [editando, setEditando] = useState<string | null>(null);
  const [rascunho, setRascunho] = useState("");
  const [modoSel, setModoSel] = useState(false);
  const [selecao, setSelecao] = useState<Set<string>>(new Set());
  const [filtro, setFiltro] = useState("");

  const todos = [...locais, ...nuvem];

  // Busca sem acento e sem diferenciar maiúsculas/minúsculas.
  const semAcento = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const alvo = semAcento(filtro.trim());
  const combina = (a: Arquivo) => !alvo || semAcento(a.nome).includes(alvo);

  const visiveis = todos.filter(combina);
  const locaisVis = locais.filter(combina);
  const nuvemVis = nuvem.filter(combina);
  const selecionados = visiveis.filter((a) => selecao.has(a.id));
  const tamanhoTotal = todos.reduce((s, a) => s + a.tamanho, 0);

  async function aoAdicionar(files: File[]) {
    onAviso("");
    const erros = await acoes.adicionar(files);
    if (erros.length) onAviso(erros.join(" "));
  }

  async function aoSubir(a: Arquivo) {
    onAviso("");
    setOcupado(a.id);
    try {
      await acoes.subir(a);
    } catch (e: any) {
      onAviso(
        e?.message ??
          "Falha ao salvar na nuvem. Confira se as migrações do banco foram aplicadas (npm run db:status).",
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

  async function aoRemoverVarios() {
    if (!selecionados.length) return;
    if (!confirm(`Remover ${selecionados.length} arquivo(s)?`)) return;
    if (aberto && selecao.has(aberto.id)) setAberto(null);
    await acoes.removerVarios(selecionados);
    setSelecao(new Set());
    setModoSel(false);
  }

  async function aoBaixar(a: Arquivo) {
    onAviso("");
    setOcupado(a.id);
    try {
      await acoes.baixar(a);
    } catch (e: any) {
      onAviso(e?.message ?? "Não foi possível baixar o arquivo.");
    } finally {
      setOcupado(null);
    }
  }

  function comecarRenomear(a: Arquivo) {
    setEditando(a.id);
    setRascunho(a.nome);
  }

  async function confirmarRenomear(a: Arquivo) {
    const nome = rascunho.trim();
    setEditando(null);
    if (!nome || nome === a.nome) return;
    onAviso("");
    try {
      await acoes.renomear(a, nome);
      if (aberto?.id === a.id) setAberto({ ...aberto, nome });
    } catch (e: any) {
      onAviso(e?.message ?? "Não foi possível renomear.");
    }
  }

  function alternarSel(id: string) {
    setSelecao((s) => {
      const novo = new Set(s);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  const todasSelecionadas =
    visiveis.length > 0 && selecionados.length === visiveis.length;

  const lista = (itens: Arquivo[]) =>
    itens.map((a) => {
      const ativo = aberto?.id === a.id;
      const emEdicao = editando === a.id;
      const formato = formatoDe(a.nome, a.mime);
      const marcado = selecao.has(a.id);

      return (
        <li
          key={a.id}
          className={`flex items-center gap-2 rounded-lg border p-2 ${
            marcado
              ? "border-blue-400 bg-blue-50/60 dark:border-blue-700 dark:bg-blue-950/30"
              : "border-slate-200 dark:border-slate-700"
          }`}
        >
          {modoSel && (
            <input
              type="checkbox"
              checked={marcado}
              onChange={() => alternarSel(a.id)}
              className="h-3.5 w-3.5 shrink-0 accent-blue-500"
            />
          )}

          <span className="min-w-0 flex-1">
            {emEdicao ? (
              <input
                autoFocus
                value={rascunho}
                onChange={(e) => setRascunho(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void confirmarRenomear(a);
                  if (e.key === "Escape") setEditando(null);
                }}
                onBlur={() => void confirmarRenomear(a)}
                className="w-full rounded border border-blue-400 bg-white px-1 py-0.5 text-sm outline-none dark:bg-slate-800 dark:text-slate-100"
              />
            ) : (
              <span className="block truncate text-sm" title={a.nome}>
                {a.nome}
              </span>
            )}
            <span className="text-xs text-slate-400 dark:text-slate-500">
              {formato === "outro" ? "" : `${formato.toUpperCase()} · `}
              {tamanhoLegivel(a.tamanho)}
            </span>
          </span>

          {!modoSel && (
            <>
              <button
                type="button"
                onClick={() => setAberto(ativo ? null : a)}
                className="shrink-0 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                {ativo ? "Fechar" : "Abrir"}
              </button>
              <button
                type="button"
                onClick={() => comecarRenomear(a)}
                title="Renomear"
                className={botaoIcone}
              >
                ✏️
              </button>
              {a.origem === "local" && (
                <button
                  type="button"
                  onClick={() => aoSubir(a)}
                  disabled={ocupado === a.id}
                  title="Salvar na nuvem (ver em qualquer aparelho)"
                  className={botaoIcone}
                >
                  {ocupado === a.id ? "⏳" : "☁️"}
                </button>
              )}
              <button
                type="button"
                onClick={() => aoBaixar(a)}
                disabled={ocupado === a.id}
                title="Salvar uma cópia no computador"
                className={botaoIcone}
              >
                ⬇️
              </button>
              <button
                type="button"
                onClick={() => aoRemover(a)}
                title="Remover"
                className={`${botaoIcone} hover:text-red-600 dark:hover:text-red-400`}
              >
                🗑
              </button>
            </>
          )}
        </li>
      );
    });

  const vazio = !carregando && todos.length === 0;

  return (
    <div className="space-y-2 rounded-lg border border-dashed border-slate-300 p-3 dark:border-slate-700">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">
          {titulo}
          {!carregando && todos.length > 0 && (
            <span className="ml-1 font-normal text-slate-400 dark:text-slate-500">
              ({todos.length}
              {tamanhoTotal > 0 ? ` · ${tamanhoLegivel(tamanhoTotal)}` : ""})
            </span>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {todos.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setModoSel((v) => !v);
                setSelecao(new Set());
              }}
              className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              {modoSel ? "Cancelar" : "☑️ Selecionar"}
            </button>
          )}
          <BotaoAdicionar onArquivos={aoAdicionar} />
        </div>
      </div>

      {todos.length >= 5 && (
        <input
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          placeholder="Filtrar por nome…"
          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        />
      )}

      {aberto && (
        <div style={{ height: alturaLeitor }}>
          <LeitorArquivo
            arquivo={aberto}
            obterBlob={acoes.obterBlob}
            className="h-full overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700"
          />
        </div>
      )}

      {modoSel && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2 py-1 text-xs dark:bg-slate-800">
          <button
            type="button"
            onClick={() =>
              setSelecao(
                todasSelecionadas
                  ? new Set()
                  : new Set(visiveis.map((a) => a.id)),
              )
            }
            className="font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            {todasSelecionadas ? "Limpar seleção" : "Selecionar todos"}
          </button>
          <span className="text-slate-400 dark:text-slate-500">
            {selecionados.length} selecionado(s)
          </span>
          <button
            type="button"
            onClick={aoRemoverVarios}
            disabled={selecionados.length === 0}
            className="ml-auto font-medium text-red-600 hover:underline disabled:opacity-40 dark:text-red-400"
          >
            🗑 Excluir
          </button>
        </div>
      )}

      {carregando && (
        <p className="text-sm text-slate-400 dark:text-slate-500">
          Carregando arquivos…
        </p>
      )}

      {vazio && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Adicione um PDF ou EPUB que já esteja no seu PC (ou arraste e solte
          aqui). Fica salvo neste navegador; use ☁️ para ter em todos os
          aparelhos.
        </p>
      )}

      {!carregando && todos.length > 0 && visiveis.length === 0 && (
        <p className="text-xs text-slate-400 dark:text-slate-500">
          Nenhum arquivo corresponde ao filtro.
        </p>
      )}

      {locaisVis.length > 0 && (
        <div className="space-y-1">
          {nuvemVis.length > 0 && (
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              📁 Neste aparelho
            </p>
          )}
          <ul className="space-y-1">{lista(locaisVis)}</ul>
        </div>
      )}

      {nuvemVis.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
            ☁️ Na nuvem
          </p>
          <ul className="space-y-1">{lista(nuvemVis)}</ul>
        </div>
      )}
    </div>
  );
}
