"use client";
import { apiFetch } from "@/lib/api-client";
import type { Topico } from "@/lib/models";
import { mensagemDe } from "@/lib/erro";
import {
  MAX_TEXTO_NO,
  acharNo,
  acharPai,
  adicionarFilho,
  alternarRecolhido,
  contarNos,
  novoNo,
  removerNo,
  renomearNo,
  validarMapa,
  type NoMapa,
} from "@/lib/mapa";
import MapaArvore from "../MapaArvore";

import { useMemo, useState } from "react";

const BOTAO =
  "rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700";

/** Bloco de mapa mental: a IA sugere os conceitos do tópico e o aluno edita e revisa. */
export default function MapaBloco({
  topico,
  onSalvarTopico,
}: {
  topico: Topico;
  onSalvarTopico: (patch: Partial<Topico>) => void | Promise<void>;
}) {
  // O mapa salvo passa pela validação: um backup antigo ou editado à mão não
  // pode derrubar a sala de estudo.
  const { mapa, corrompido } = useMemo(() => {
    if (topico.mapa === undefined)
      return { mapa: undefined, corrompido: false };
    try {
      return { mapa: validarMapa(topico.mapa), corrompido: false };
    } catch {
      return { mapa: undefined, corrompido: true };
    }
  }, [topico.mapa]);
  const [gerando, setGerando] = useState(false);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [revisao, setRevisao] = useState(false);
  const [revelados, setRevelados] = useState<Set<string>>(new Set());
  const [desfazer, setDesfazer] = useState<NoMapa | null>(null);

  function salvar(novo: NoMapa | undefined) {
    Promise.resolve(onSalvarTopico({ mapa: novo })).catch(() => {});
  }

  async function gerar() {
    if (
      mapa &&
      !confirm(
        "Gerar um mapa novo? O mapa atual e suas edições serão substituídos.",
      )
    )
      return;
    setGerando(true);
    try {
      const res = await apiFetch("/api/generate-mindmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: topico.titulo,
          descricao: topico.descricao,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.erro ?? "Erro ao gerar o mapa");
      setSelecionado(null);
      setDesfazer(null);
      setRevelados(new Set());
      await onSalvarTopico({ mapa: data.mapa });
    } catch (e) {
      alert(mensagemDe(e));
    } finally {
      setGerando(false);
    }
  }

  const sel = selecionado && mapa ? selecionado : null;

  function adicionar() {
    if (!mapa) return;
    const filho = novoNo("Novo conceito");
    salvar(adicionarFilho(mapa, sel ?? mapa.id, filho));
    setSelecionado(filho.id);
    setNome("Novo conceito");
  }

  function confirmarNome() {
    if (mapa && sel && nome !== null) salvar(renomearNo(mapa, sel, nome));
    setNome(null);
  }

  function apagar() {
    if (!mapa || !sel || sel === mapa.id) return;
    setDesfazer(mapa);
    setSelecionado(acharPai(mapa, sel)?.id ?? null);
    salvar(removerNo(mapa, sel));
  }

  function alternarRevisao() {
    setRevisao((r) => !r);
    setRevelados(new Set());
    setNome(null);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">🧠 Mapa mental</h3>
        <button
          onClick={gerar}
          disabled={gerando}
          className="rounded-lg bg-teal-600 px-3 py-1 text-xs font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {gerando ? "Gerando..." : mapa ? "Gerar novamente" : "Gerar com IA"}
        </button>
      </div>

      {!mapa ? (
        <div className="text-sm text-slate-400 dark:text-slate-500">
          <p>
            {corrompido
              ? "Não foi possível ler o mapa salvo deste tópico. Gere um novo ou comece um em branco."
              : "Nenhum mapa ainda. A IA divide o tópico nos grandes eixos e nas ideias-chave de cada um, e você ajusta como quiser."}
          </p>
          <button
            onClick={() => salvar(novoNo(topico.titulo.slice(0, MAX_TEXTO_NO)))}
            className="mt-2 text-xs text-teal-700 hover:underline dark:text-teal-400"
          >
            Ou comece um mapa em branco
          </button>
        </div>
      ) : (
        <>
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {revisao ? (
              <>
                <button onClick={alternarRevisao} className={BOTAO}>
                  Sair da revisão
                </button>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Lembre e clique para conferir · {revelados.size} de{" "}
                  {contarNos(mapa) - 1}
                </span>
                {revelados.size > 0 && (
                  <button
                    onClick={() => setRevelados(new Set())}
                    className={BOTAO}
                  >
                    Esconder de novo
                  </button>
                )}
              </>
            ) : (
              <>
                <button onClick={adicionar} className={BOTAO}>
                  ＋ Conceito
                </button>
                {nome !== null && sel ? (
                  <form
                    className="flex gap-1"
                    onSubmit={(e) => {
                      e.preventDefault();
                      confirmarNome();
                    }}
                  >
                    <input
                      autoFocus
                      value={nome}
                      maxLength={MAX_TEXTO_NO}
                      aria-label="Nome do conceito"
                      onChange={(e) => setNome(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      onKeyDown={(e) => e.key === "Escape" && setNome(null)}
                      className="w-44 rounded-lg border border-teal-500 bg-white px-2 py-1 text-xs dark:bg-slate-800"
                    />
                    <button className={BOTAO}>OK</button>
                  </form>
                ) : (
                  <button
                    onClick={() =>
                      sel && setNome(acharNo(mapa, sel)?.texto ?? "")
                    }
                    disabled={!sel}
                    className={BOTAO}
                  >
                    Renomear
                  </button>
                )}
                <button
                  onClick={apagar}
                  disabled={!sel || sel === mapa.id}
                  className={BOTAO}
                >
                  Apagar
                </button>
                {desfazer && (
                  <button
                    onClick={() => {
                      salvar(desfazer);
                      setDesfazer(null);
                    }}
                    className={BOTAO}
                  >
                    Desfazer
                  </button>
                )}
                <button onClick={alternarRevisao} className={BOTAO}>
                  Modo revisão
                </button>
              </>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-dashed border-slate-200 bg-slate-50 p-2 dark:border-slate-700 dark:bg-slate-950">
            <MapaArvore
              titulo={`Mapa mental de ${topico.titulo}`}
              raiz={mapa}
              variante={(_, d) => (d === 0 ? "raiz" : "normal")}
              selecionado={revisao ? null : sel}
              rotulo={(no) =>
                revisao && no.id !== mapa.id && !revelados.has(no.id)
                  ? "• • •"
                  : no.texto
              }
              onClicar={(id) => {
                if (revisao) {
                  if (id !== mapa.id) setRevelados((r) => new Set(r).add(id));
                  return;
                }
                setNome(null);
                setSelecionado(id);
              }}
              onAlternar={(id) => salvar(alternarRecolhido(mapa, id))}
            />
          </div>
          {!revisao && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Clique num conceito para selecionar. “＋ Conceito” cria um ramo
              dentro do selecionado.
            </p>
          )}
        </>
      )}
    </div>
  );
}
