"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ALTURA_LINHA,
  COLUNAS,
  ESPACO,
  PRESETS,
  TIPOS,
  TIPOS_ORDEM,
  blocosDoArranjo,
  cabe,
  carregarArranjos,
  normalizarArranjos,
  novoIdArranjo,
  presetId,
  salvarArranjos,
  topicKey,
  type Arranjos,
  type Bloco,
  type TipoBloco,
} from "@/lib/layout";
import VideosBloco from "@/components/blocos/VideosBloco";
import LivrosBloco from "@/components/blocos/LivrosBloco";
import ArtigosBloco from "@/components/blocos/ArtigosBloco";
import ArquivosBloco from "@/components/blocos/ArquivosBloco";
import NotasBloco from "@/components/blocos/NotasBloco";
import FlashcardsBloco from "@/components/blocos/FlashcardsBloco";
import QuizBloco from "@/components/blocos/QuizBloco";
import ThemeToggle from "@/components/ThemeToggle";

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/** Direção da alça de redimensionamento. */
type Direcao = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type Arrasto = {
  id: TipoBloco;
  modo: "mover" | "redimensionar";
  dir?: Direcao;
  inicioX: number;
  inicioY: number;
  base: Bloco;
};

/** Alças de redimensionamento: 4 cantos + 4 laterais. */
const ALCAS: {
  dir: Direcao;
  pos: string;
  cursor: string;
  canto?: string;
}[] = [
  {
    dir: "nw",
    pos: "left-0 top-0",
    cursor: "cursor-nwse-resize",
    canto: "border-l-2 border-t-2",
  },
  {
    dir: "ne",
    pos: "right-0 top-0",
    cursor: "cursor-nesw-resize",
    canto: "border-r-2 border-t-2",
  },
  {
    dir: "sw",
    pos: "left-0 bottom-0",
    cursor: "cursor-nesw-resize",
    canto: "border-l-2 border-b-2",
  },
  {
    dir: "se",
    pos: "right-0 bottom-0",
    cursor: "cursor-nwse-resize",
    canto: "border-r-2 border-b-2",
  },
  {
    dir: "n",
    pos: "left-1/2 top-0 -translate-x-1/2",
    cursor: "cursor-ns-resize",
  },
  {
    dir: "s",
    pos: "left-1/2 bottom-0 -translate-x-1/2",
    cursor: "cursor-ns-resize",
  },
  {
    dir: "e",
    pos: "right-0 top-1/2 -translate-y-1/2",
    cursor: "cursor-ew-resize",
  },
  {
    dir: "w",
    pos: "left-0 top-1/2 -translate-y-1/2",
    cursor: "cursor-ew-resize",
  },
];

/**
 * Workspace em blocos (estilo "snap"): os recursos do tópico ficam em blocos
 * que podem ser movidos e redimensionados livremente, ou reorganizados por
 * arranjos prontos/salvos. O usuário pode salvar arranjos nomeados e escolher
 * qual usar em cada tópico; tudo fica salvo na nuvem.
 */
export default function WorkspaceBlocos({
  topico,
  indice,
  roteiroId,
  onFechar,
  onSalvarTopico,
}: {
  topico: any;
  indice: number;
  roteiroId: string;
  onFechar: () => void;
  onSalvarTopico: (patch: Record<string, any>) => void;
}) {
  const chave = topicKey(roteiroId, indice);

  const [arranjos, setArranjos] = useState<Arranjos | null>(null);
  const [ativo, setAtivo] = useState<TipoBloco | null>(null);
  const [preview, setPreview] = useState<Bloco | null>(null);
  const [largura, setLargura] = useState(0);
  const [ehMobile, setEhMobile] = useState(false);
  // Bloco exibido em tela cheia (encaixado na grade ocupando toda a área).
  const [telaCheia, setTelaCheia] = useState<TipoBloco | null>(null);

  // Esc sai da tela cheia.
  useEffect(() => {
    if (!telaCheia) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setTelaCheia(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [telaCheia]);

  const areaRef = useRef<HTMLDivElement>(null);
  const arrasto = useRef<Arrasto | null>(null);
  const previewRef = useRef<Bloco | null>(null);
  const layoutRef = useRef<Bloco[] | null>(null);
  const primeiraCarga = useRef(true);
  // Guarda o último toque no cabeçalho, para detectar duplo-clique.
  const ultimoToque = useRef<{ id: TipoBloco | null; t: number }>({
    id: null,
    t: 0,
  });

  // Carrega os arranjos salvos (ou usa o padrão).
  useEffect(() => {
    let vivo = true;
    carregarArranjos().then(
      (a) => vivo && setArranjos(a ?? normalizarArranjos(null)),
    );
    return () => {
      vivo = false;
    };
  }, []);

  const layout = arranjos
    ? (arranjos.trabalho[chave] ?? arranjos.padrao)
    : null;

  // Salva os arranjos (com um pequeno atraso) sempre que mudarem.
  useEffect(() => {
    if (!arranjos) return;
    if (primeiraCarga.current) {
      primeiraCarga.current = false;
      return;
    }
    const t = setTimeout(() => salvarArranjos(arranjos), 700);
    return () => clearTimeout(t);
  }, [arranjos]);

  // Detecta o celular (uma vez no mount).
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const atualiza = () => setEhMobile(mq.matches);
    atualiza();
    mq.addEventListener("change", atualiza);
    return () => mq.removeEventListener("change", atualiza);
  }, []);

  // Mede a largura da área da grade. Roda quando a grade passa a existir.
  const gradeVisivel = layout !== null && !ehMobile;
  useEffect(() => {
    if (!gradeVisivel) return;
    const el = areaRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setLargura(e.contentRect.width));
    ro.observe(el);
    setLargura(el.clientWidth);
    return () => ro.disconnect();
  }, [gradeVisivel]);

  const colW = largura > 0 ? (largura - ESPACO * (COLUNAS - 1)) / COLUNAS : 0;
  const passoX = colW + ESPACO;
  const passoY = ALTURA_LINHA + ESPACO;

  // Mantém uma referência atual do layout (evita closures desatualizadas).
  useEffect(() => {
    layoutRef.current = layout;
  }, [layout]);

  /** Aplica um layout só ao tópico atual (edição à mão). */
  function definirLayout(blocos: Bloco[], marcaEscolha = true) {
    setArranjos((a) =>
      a
        ? {
            ...a,
            trabalho: { ...a.trabalho, [chave]: blocos },
            escolha: marcaEscolha
              ? { ...a.escolha, [chave]: "custom" }
              : a.escolha,
          }
        : a,
    );
  }

  // Durante o arrasto só mexemos na pré-visualização — o layout "de verdade"
  // muda apenas ao soltar, e só se a posição não sobrepuser outro bloco.
  const aoMover = useCallback(
    (e: PointerEvent) => {
      const d = arrasto.current;
      const atual = layoutRef.current;
      if (!d || !atual) return;
      const dx = Math.round((e.clientX - d.inicioX) / passoX);
      const dy = Math.round((e.clientY - d.inicioY) / passoY);
      const alvo = atual.find((b) => b.id === d.id);
      if (!alvo) return;

      let novo: Bloco;
      if (d.modo === "mover") {
        novo = {
          ...alvo,
          x: clamp(d.base.x + dx, 0, COLUNAS - alvo.w),
          y: Math.max(0, d.base.y + dy),
        };
      } else {
        const dir = d.dir ?? "se";
        const bordaDireita = d.base.x + d.base.w; // borda direita fixa
        const bordaBaixo = d.base.y + d.base.h; // borda inferior fixa
        let x = d.base.x;
        let y = d.base.y;
        let w = d.base.w;
        let h = d.base.h;

        if (dir.includes("e")) {
          w = clamp(d.base.w + dx, 1, COLUNAS - d.base.x);
        }
        if (dir.includes("w")) {
          const nx = clamp(d.base.x + dx, 0, bordaDireita - 1);
          x = nx;
          w = bordaDireita - nx;
        }
        if (dir.includes("s")) {
          h = Math.max(2, d.base.h + dy);
        }
        if (dir.includes("n")) {
          const ny = clamp(d.base.y + dy, 0, bordaBaixo - 2);
          y = ny;
          h = bordaBaixo - ny;
        }
        novo = { ...alvo, x, y, w, h };
      }

      previewRef.current = novo;
      setPreview(novo);
    },
    [passoX, passoY],
  );

  const aoSoltar = useCallback(() => {
    const d = arrasto.current;
    const p = previewRef.current;
    const atual = layoutRef.current;
    if (d && p && atual && cabe(atual, p)) {
      const blocos = atual.map((b) => (b.id === d.id ? p : b));
      setArranjos((a) =>
        a
          ? {
              ...a,
              trabalho: { ...a.trabalho, [chave]: blocos },
              escolha: { ...a.escolha, [chave]: "custom" },
            }
          : a,
      );
    }
    arrasto.current = null;
    previewRef.current = null;
    setPreview(null);
    setAtivo(null);
    window.removeEventListener("pointermove", aoMover);
    window.removeEventListener("pointerup", aoSoltar);
  }, [aoMover, chave]);

  function iniciar(
    e: React.PointerEvent,
    bloco: Bloco,
    modo: "mover" | "redimensionar",
    dir?: Direcao,
  ) {
    if (ehMobile) return;

    // Duplo-clique/toque no cabeçalho alterna a tela cheia.
    if (modo === "mover") {
      const agora = Date.now();
      if (
        ultimoToque.current.id === bloco.id &&
        agora - ultimoToque.current.t < 350
      ) {
        ultimoToque.current = { id: null, t: 0 };
        e.preventDefault();
        e.stopPropagation();
        setTelaCheia((t) => (t === bloco.id ? null : bloco.id));
        return;
      }
      ultimoToque.current = { id: bloco.id, t: agora };
    }

    e.preventDefault();
    e.stopPropagation();
    arrasto.current = {
      id: bloco.id,
      modo,
      dir,
      inicioX: e.clientX,
      inicioY: e.clientY,
      base: { ...bloco },
    };
    previewRef.current = null;
    setPreview(null);
    setAtivo(bloco.id);
    window.addEventListener("pointermove", aoMover);
    window.addEventListener("pointerup", aoSoltar);
  }

  // Limpa listeners se desmontar no meio de um arrasto.
  useEffect(
    () => () => {
      window.removeEventListener("pointermove", aoMover);
      window.removeEventListener("pointerup", aoSoltar);
    },
    [aoMover, aoSoltar],
  );

  /** Aplica um arranjo (pronto ou salvo) ao tópico atual. */
  function aplicar(id: string) {
    if (id === "custom" || !arranjos) return;
    const blocos = blocosDoArranjo(arranjos, id);
    if (!blocos) return;
    setArranjos((a) =>
      a
        ? {
            ...a,
            trabalho: { ...a.trabalho, [chave]: blocos },
            escolha: { ...a.escolha, [chave]: id },
          }
        : a,
    );
  }

  /** Aplica o arranjo atual a TODOS os tópicos (limpa ajustes individuais). */
  function aplicarTodos() {
    if (!arranjos || !layout) return;
    const id = escolhaAtual;
    const nomeArranjo =
      id === "custom"
        ? "o arranjo personalizado atual"
        : `o arranjo "${
            arranjos.salvos.find((s) => s.id === id)?.nome ??
            id.replace("preset:", "")
          }"`;
    if (
      !confirm(
        `Aplicar ${nomeArranjo} a TODOS os tópicos?\n\nOs ajustes individuais de cada tópico serão substituídos.`,
      )
    )
      return;
    const blocos = layout.map((b) => ({ ...b }));
    setArranjos((a) =>
      a
        ? {
            ...a,
            padrao: blocos,
            trabalho: {},
            escolha: {},
            escolhaGlobal: id === "custom" ? undefined : id,
          }
        : a,
    );
  }

  /** Salva o arranjo atual da tópico como um arranjo nomeado. */
  function salvarArranjo() {
    if (!arranjos || !layout) return;
    const sugerido = `Arranjo ${arranjos.salvos.length + 1}`;
    const nome = prompt("Nome do arranjo:", sugerido);
    if (!nome || !nome.trim()) return;
    const novo = {
      id: novoIdArranjo(),
      nome: nome.trim(),
      blocos: layout.map((b) => ({ ...b })),
    };
    setArranjos((a) =>
      a
        ? {
            ...a,
            salvos: [...a.salvos, novo],
            escolha: { ...a.escolha, [chave]: novo.id },
          }
        : a,
    );
  }

  function excluirArranjo(id: string) {
    if (!id || id === "custom" || id.startsWith("preset:")) return;
    if (!confirm("Excluir este arranjo salvo?")) return;
    setArranjos((a) => {
      if (!a) return a;
      const escolha: Record<string, string> = {};
      for (const [k, v] of Object.entries(a.escolha))
        escolha[k] = v === id ? "custom" : v;
      return {
        ...a,
        salvos: a.salvos.filter((s) => s.id !== id),
        escolha,
        escolhaGlobal: a.escolhaGlobal === id ? undefined : a.escolhaGlobal,
      };
    });
  }

  function ocultar(id: TipoBloco) {
    if (!layout) return;
    definirLayout(
      layout.map((b) => (b.id === id ? { ...b, oculto: true } : b)),
    );
  }

  function mostrar(id: TipoBloco) {
    if (!layout) return;
    definirLayout(
      layout.map((b) => (b.id === id ? { ...b, oculto: false } : b)),
    );
  }

  /**
   * Reorganiza TODOS os blocos numa grade 12×H **sem lacunas**: em vez de só
   * reposicionar, ajusta a altura/largura de cada bloco para que eles preencham
   * o retângulo inteiro (empacotamento tipo "treemap", com divisões
   * proporcionais à área atual de cada bloco).
   *
   * Como o layout persistido exige altura mínima de 2 linhas, tentamos alturas
   * cada vez maiores até nenhum bloco ficar fino demais. Em último caso (nunca
   * deve acontecer na prática), caímos num reposicionamento simples por
   * "skyline", que ao menos evita sobreposição.
   */
  function encaixarTodos() {
    if (!layout) return;
    const visiveis = layout.filter((b) => !b.oculto);
    const ocultos = layout.filter((b) => b.oculto);

    // Com 0 ou 1 bloco visível não há lacunas a corrigir — não redimensiona.
    if (visiveis.length < 2) return;

    const areaTotal = visiveis.reduce((a, b) => a + b.w * b.h, 0) || 1;
    const pesos = visiveis.map((b) => Math.max(1, b.w * b.h));

    // Maiores primeiro → resultado mais equilibrado.
    const indices = visiveis
      .map((_, i) => i)
      .sort((a, b) => pesos[b] - pesos[a]);

    /** Tenta empacotar numa grade 12×H. Devolve null se algo ficar fino demais. */
    const tentar = (H: number): Bloco[] | null => {
      const res = new Map<TipoBloco, Bloco>();
      let falhou = false;

      const distribuir = (
        ids: number[],
        x: number,
        y: number,
        w: number,
        h: number,
      ) => {
        if (falhou || ids.length === 0) return;
        if (ids.length === 1) {
          const b = visiveis[ids[0]];
          res.set(b.id, { ...b, x, y, w, h, oculto: false });
          return;
        }
        if (w < 2 && h < 2) {
          falhou = true;
          return;
        }

        const total = ids.reduce((a, i) => a + pesos[i], 0);
        let acc = 0;
        let melhorDif = Infinity;
        let corte = 1;
        for (let k = 0; k < ids.length - 1; k++) {
          acc += pesos[ids[k]];
          const dif = Math.abs(acc - total / 2);
          if (dif < melhorDif) {
            melhorDif = dif;
            corte = k + 1;
          }
        }
        const grupoA = ids.slice(0, corte);
        const grupoB = ids.slice(corte);
        const pesoA = grupoA.reduce((a, i) => a + pesos[i], 0);
        const fracao = pesoA / total;

        // Divide ao longo do lado maior (mantém os blocos mais quadrados).
        const horizontal = w < 2 ? false : h < 2 ? true : w >= h;
        if (horizontal) {
          const wA = clamp(Math.round(w * fracao), 1, w - 1);
          distribuir(grupoA, x, y, wA, h);
          distribuir(grupoB, x + wA, y, w - wA, h);
        } else {
          const hA = clamp(Math.round(h * fracao), 1, h - 1);
          distribuir(grupoA, x, y, w, hA);
          distribuir(grupoB, x, y + hA, w, h - hA);
        }
      };

      if (indices.length === 1) {
        const b = visiveis[indices[0]];
        res.set(b.id, { ...b, x: 0, y: 0, w: COLUNAS, h: H, oculto: false });
      } else {
        distribuir(indices, 0, 0, COLUNAS, H);
      }

      if (falhou) return null;
      const lista = visiveis
        .map((b) => res.get(b.id))
        .filter(Boolean) as Bloco[];
      if (lista.length !== visiveis.length) return null;
      if (lista.some((b) => b.h < 2 || b.w < 1)) return null;
      return lista;
    };

    let novosVisiveis: Bloco[] | null = null;
    const baseH = Math.max(
      2 * visiveis.length,
      Math.round(areaTotal / COLUNAS),
    );
    for (let H = baseH; H <= baseH + 12 && !novosVisiveis; H++) {
      novosVisiveis = tentar(H);
    }

    // Último recurso: só reposiciona (skyline), sem redimensionar.
    if (!novosVisiveis) {
      const colunas = new Array(COLUNAS).fill(0);
      novosVisiveis = [];
      for (const b of [...visiveis].sort((a, b) => a.y - b.y || a.x - b.x)) {
        const w = clamp(b.w, 1, COLUNAS);
        let melhorX = 0;
        let melhorY = Infinity;
        for (let x = 0; x + w <= COLUNAS; x++) {
          let y = 0;
          for (let c = x; c < x + w; c++) y = Math.max(y, colunas[c]);
          if (y < melhorY) {
            melhorY = y;
            melhorX = x;
          }
        }
        for (let c = melhorX; c < melhorX + w; c++) colunas[c] = melhorY + b.h;
        novosVisiveis.push({ ...b, x: melhorX, y: melhorY, w });
      }
    }

    // Blocos ocultos: empilhados abaixo, em largura total, sem sobrepor.
    let y = novosVisiveis.reduce((a, b) => Math.max(a, b.y + b.h), 0);
    const novos: Bloco[] = [...novosVisiveis];
    for (const b of ocultos) {
      novos.push({ ...b, x: 0, y, w: COLUNAS });
      y += b.h;
    }

    definirLayout(novos);
  }

  function conteudo(id: TipoBloco) {
    switch (id) {
      case "video":
        return <VideosBloco topico={topico} compacto />;
      case "livro":
        return (
          <LivrosBloco
            topico={topico}
            roteiroId={roteiroId}
            indice={indice}
            compacto
          />
        );
      case "artigos":
        return (
          <ArtigosBloco
            topico={topico}
            roteiroId={roteiroId}
            indice={indice}
            compacto
          />
        );
      case "arquivos":
        return <ArquivosBloco roteiroId={roteiroId} indice={indice} />;
      case "notas":
        return (
          <NotasBloco
            key={indice}
            topico={topico}
            indice={indice}
            roteiroId={roteiroId}
            onSalvarTopico={onSalvarTopico}
          />
        );
      case "flashcards":
        return (
          <FlashcardsBloco topico={topico} onSalvarTopico={onSalvarTopico} />
        );
      case "quiz":
        return <QuizBloco topico={topico} />;
    }
  }

  const escolhaAtual =
    arranjos?.escolha[chave] ?? arranjos?.escolhaGlobal ?? "custom";
  const podeExcluir =
    escolhaAtual !== "custom" && !escolhaAtual.startsWith("preset:");

  const visiveis = layout ? layout.filter((b) => !b.oculto) : [];
  const ocultos = layout ? layout.filter((b) => b.oculto) : [];
  const linhas = visiveis.length
    ? Math.max(...visiveis.map((b) => b.y + b.h))
    : 0;
  const altura = linhas > 0 ? linhas * passoY - ESPACO : 0;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-100 dark:bg-slate-950">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
        <div className="min-w-0">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Workspace em blocos · Tópico {indice + 1}
          </p>
          <h2 className="truncate font-semibold">{topico?.titulo}</h2>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <select
            value={escolhaAtual}
            onChange={(e) => aplicar(e.target.value)}
            title="Escolher o arranjo deste tópico"
            className="max-w-[16rem] rounded-lg border border-slate-300 bg-white px-2 py-1 font-medium outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="custom">Personalizado</option>
            <optgroup label="Prontos">
              {PRESETS.map((p) => (
                <option key={p.nome} value={presetId(p.nome)}>
                  {p.nome}
                </option>
              ))}
            </optgroup>
            {arranjos && arranjos.salvos.length > 0 && (
              <optgroup label="Meus arranjos">
                {arranjos.salvos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          <button
            onClick={salvarArranjo}
            title="Salvar o arranjo atual com um nome"
            className="rounded-lg border border-slate-300 px-2 py-1 font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            💾 Salvar arranjo
          </button>
          {podeExcluir && (
            <button
              onClick={() => excluirArranjo(escolhaAtual)}
              title="Excluir este arranjo salvo"
              className="rounded-lg border border-slate-300 px-2 py-1 font-medium text-red-600 hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              🗑 Excluir
            </button>
          )}
          <button
            onClick={aplicarTodos}
            title="Aplicar este arranjo a todos os tópicos (substitui os ajustes individuais)"
            className="rounded-lg border border-blue-300 bg-blue-50 px-2 py-1 font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
          >
            📌 Aplicar a todos
          </button>
          {!ehMobile && (
            <button
              onClick={encaixarTodos}
              title="Preencher a grade sem lacunas: ajusta altura/largura dos blocos para encaixarem"
              className="rounded-lg border border-slate-300 px-2 py-1 font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              🧲 Encaixar todos
            </button>
          )}
        </div>

        {ocultos.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-slate-400 dark:text-slate-500">Ocultos:</span>
            {ocultos.map((b) => (
              <button
                key={b.id}
                onClick={() => mostrar(b.id)}
                title="Mostrar bloco"
                className="rounded-lg bg-slate-100 px-2 py-1 font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              >
                + {TIPOS[b.id].icone} {TIPOS[b.id].rotulo}
              </button>
            ))}
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={onFechar}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            ← Voltar ao painel
          </button>
        </div>
      </header>

      <div
        className={`flex-1 overflow-auto p-2 ${telaCheia ? "flex flex-col" : ""}`}
      >
        {!layout ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">
            Carregando arranjo...
          </p>
        ) : telaCheia ? (
          // Tela cheia: um bloco ocupa toda a área do workspace.
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow dark:border-slate-800 dark:bg-slate-900">
            <header className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-2.5 py-1.5 dark:border-slate-800 dark:bg-slate-800/60">
              <span className="text-sm font-semibold">
                {TIPOS[telaCheia].icone} {TIPOS[telaCheia].rotulo}
              </span>
              <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                ocupando toda a grade
              </span>
              <button
                onClick={() => setTelaCheia(null)}
                title="Sair da tela cheia (Esc)"
                className="rounded-lg border border-slate-300 px-2 py-0.5 text-xs font-medium hover:bg-slate-100 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                ⤡ Restaurar
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-auto p-3">
              {conteudo(telaCheia)}
            </div>
          </div>
        ) : ehMobile ? (
          // Celular: blocos empilhados (sem arrastar/redimensionar).
          <div className="space-y-4">
            {TIPOS_ORDEM.filter((id) => visiveis.some((v) => v.id === id)).map(
              (id) => (
                <section
                  key={id}
                  className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
                >
                  <div
                    className="mb-2 flex items-center justify-between"
                    onDoubleClick={() =>
                      setTelaCheia((t) => (t === id ? null : id))
                    }
                    title="Duplo-toque para tela cheia"
                  >
                    <h3 className="text-sm font-semibold">
                      {TIPOS[id].icone} {TIPOS[id].rotulo}
                    </h3>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setTelaCheia(id)}
                        title="Encaixar na grade / tela cheia"
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                      >
                        ⛶
                      </button>
                      <button
                        onClick={() => ocultar(id)}
                        title="Ocultar bloco"
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                      >
                        👁
                      </button>
                    </div>
                  </div>
                  {conteudo(id)}
                </section>
              ),
            )}
          </div>
        ) : (
          <div
            ref={areaRef}
            className="relative w-full"
            style={{ height: altura }}
          >
            {largura > 0 &&
              visiveis.map((b) => {
                const arrastandoEste = preview?.id === b.id;
                const exibido = arrastandoEste && preview ? preview : b;
                const invalido =
                  arrastandoEste && preview ? !cabe(layout, preview) : false;
                return (
                  <div
                    key={b.id}
                    style={{
                      left: exibido.x * passoX,
                      top: exibido.y * passoY,
                      width: exibido.w * colW + (exibido.w - 1) * ESPACO,
                      height:
                        exibido.h * ALTURA_LINHA + (exibido.h - 1) * ESPACO,
                    }}
                    className={`absolute flex flex-col overflow-hidden rounded-xl border bg-white shadow-sm dark:bg-slate-900 ${
                      invalido
                        ? "border-red-400 ring-2 ring-red-400/70"
                        : ativo === b.id
                          ? "border-blue-500 shadow-lg ring-2 ring-blue-400/60 dark:border-blue-500"
                          : "border-slate-200 dark:border-slate-800"
                    }`}
                  >
                    <header
                      onPointerDown={(e) => iniciar(e, b, "mover")}
                      style={{ touchAction: "none" }}
                      title="Arraste para mover · duplo-clique para tela cheia"
                      className="flex cursor-grab items-center gap-2 border-b border-slate-200 bg-slate-50 px-2.5 py-1.5 select-none active:cursor-grabbing dark:border-slate-800 dark:bg-slate-800/60"
                    >
                      <span className="text-sm font-semibold">
                        {TIPOS[b.id].icone} {TIPOS[b.id].rotulo}
                      </span>
                      <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                        ⠿
                      </span>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => setTelaCheia(b.id)}
                        title="Encaixar na grade / tela cheia"
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                      >
                        ⛶
                      </button>
                      <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={() => ocultar(b.id)}
                        title="Ocultar bloco"
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-slate-100"
                      >
                        👁
                      </button>
                    </header>

                    <div className="min-h-0 flex-1 overflow-auto p-2">
                      {conteudo(b.id)}
                    </div>

                    {ALCAS.map((a) => {
                      const tam = a.canto
                        ? "h-2.5 w-2.5"
                        : a.dir === "n" || a.dir === "s"
                          ? "h-2 w-12"
                          : "h-12 w-2";
                      const visual = a.canto
                        ? `border-slate-400 dark:border-slate-500 ${a.canto}`
                        : "rounded-full hover:bg-slate-400/50 dark:hover:bg-slate-500/50";
                      return (
                        <div
                          key={a.dir}
                          onPointerDown={(e) =>
                            iniciar(e, b, "redimensionar", a.dir)
                          }
                          style={{ touchAction: "none" }}
                          title="Redimensionar"
                          className={`absolute z-20 ${tam} ${a.pos} ${a.cursor} ${visual}`}
                        />
                      );
                    })}
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
