"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useDialog } from "./useDialog";
import Icon, { type IconName } from "./Icon";
import { supabase } from "@/lib/supabase";
import {
  ALTURA_LINHA,
  COLUNAS,
  ESPACO,
  PRESETS,
  TIPOS,
  blocosDoArranjo,
  carregarArranjos,
  guardarArranjosLocal,
  lerArranjosLocal,
  normalizarArranjos,
  novoIdArranjo,
  presetId,
  salvarArranjos,
  topicKey,
  type Arranjos,
  type Bloco,
  type Layout,
  type TipoBloco,
} from "@/lib/layout";
import { acomodarBloco, organizarWorkspace } from "@/lib/workspace";
import VideosBloco from "./blocos/VideosBloco";
import LivrosBloco from "./blocos/LivrosBloco";
import ArtigosBloco from "./blocos/ArtigosBloco";
import ArquivosBloco from "./blocos/ArquivosBloco";
import NotasBloco from "./blocos/NotasBloco";
import FlashcardsBloco from "./blocos/FlashcardsBloco";
import QuizBloco from "./blocos/QuizBloco";
import ThemeToggle from "./ThemeToggle";
import type { Topico } from "@/lib/models";
const ICONES: Record<TipoBloco, IconName> = {
  video: "arrow",
  livro: "book",
  artigos: "chart",
  arquivos: "book",
  notas: "keyboard",
  flashcards: "repeat",
  quiz: "spark",
};
type Direcao = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
const DIRECOES: Direcao[] = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
type Arrasto = {
  base: Bloco;
  modo: "mover" | "redimensionar";
  dir: Direcao;
  x: number;
  y: number;
  scroll: number;
};
const limitar = (n: number, a: number, b: number) =>
  Math.max(a, Math.min(b, n));
export default function WorkspaceBlocos({
  topico,
  indice,
  roteiroId,
  onFechar,
  onSalvarTopico,
}: {
  topico: Topico;
  indice: number;
  roteiroId: string;
  onFechar: () => void;
  onSalvarTopico: (patch: Partial<Topico>) => void | Promise<void>;
}) {
  const dialogRef = useDialog<HTMLDivElement>(true);
  const chave = topicKey(roteiroId, indice);
  const [arranjos, setArranjos] = useState<Arranjos | null>(null);
  const [estado, setEstado] = useState("Carregando layout…");
  const [erro, setErro] = useState("");
  const [editar, setEditar] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [largura, setLargura] = useState(0);
  const [telaCheia, setTelaCheia] = useState<TipoBloco | null>(null);
  const [preview, setPreview] = useState<Layout | null>(null);
  const [ativo, setAtivo] = useState<TipoBloco | null>(null);
  const [podeDesfazer, setPodeDesfazer] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null),
    scrollRef = useRef<HTMLDivElement>(null);
  const atualRef = useRef<Arranjos | null>(null),
    anteriorRef = useRef<Arranjos | null>(null);
  const uidRef = useRef<string | null>(null),
    dirtyRef = useRef(false),
    vivoRef = useRef(true);
  const filaRef = useRef(Promise.resolve());
  const arrastoRef = useRef<Arrasto | null>(null),
    candidatoRef = useRef<Bloco | null>(null);
  const sincronizar = useCallback(() => {
    const snapshot = atualRef.current;
    if (!snapshot || !dirtyRef.current) return filaRef.current;
    if (vivoRef.current) setEstado("Sincronizando…");
    const tarefa = filaRef.current
      .catch(() => {})
      .then(() => salvarArranjos(snapshot));
    filaRef.current = tarefa;
    return tarefa
      .then(() => {
        if (atualRef.current === snapshot) {
          dirtyRef.current = false;
          if (vivoRef.current) {
            setEstado("Layout salvo");
            setErro("");
          }
        }
      })
      .catch(() => {
        if (vivoRef.current) {
          const local = uidRef.current
            ? lerArranjosLocal(uidRef.current)
            : null;
          const preservado =
            local &&
            JSON.stringify(local.arranjos) === JSON.stringify(atualRef.current);
          setEstado(
            preservado ? "Salvo neste aparelho" : "Alterações pendentes",
          );
          setErro(
            preservado
              ? "Não foi possível sincronizar o layout com sua conta. Sua organização foi preservada neste navegador."
              : "Não foi possível salvar o layout. Mantenha esta tela aberta e tente sincronizar novamente.",
          );
        }
      });
  }, []);
  useEffect(() => {
    vivoRef.current = true;
    let cancelado = false;
    async function carregar() {
      try {
        const { data } = await supabase.auth.getSession();
        uidRef.current = data.session?.user.id ?? null;
        const resultado = await carregarArranjos();
        if (cancelado) return;
        const novo = resultado ?? normalizarArranjos(null);
        atualRef.current = novo;
        setArranjos(novo);
        const pendente = uidRef.current
          ? lerArranjosLocal(uidRef.current)?.pendente
          : false;
        dirtyRef.current = !!pendente;
        setEstado(pendente ? "Salvo neste aparelho" : "Layout pronto");
        if (pendente) void sincronizar();
      } catch {
        if (!cancelado) {
          const novo = normalizarArranjos(null);
          atualRef.current = novo;
          setArranjos(novo);
          setEstado("Layout padrão");
          setErro(
            "Não foi possível carregar seu layout. Você pode continuar estudando.",
          );
        }
      }
    }
    void carregar();
    return () => {
      cancelado = true;
      vivoRef.current = false;
      void sincronizar();
    };
  }, [sincronizar]);
  useEffect(() => {
    if (!arranjos || !dirtyRef.current) return;
    const timer = setTimeout(() => void sincronizar(), 600);
    return () => clearTimeout(timer);
  }, [arranjos, sincronizar]);
  const alterar = useCallback((novo: Arranjos, guardarHistorico = true) => {
    if (guardarHistorico) {
      anteriorRef.current = atualRef.current;
      setPodeDesfazer(true);
    }
    atualRef.current = novo;
    dirtyRef.current = true;
    try {
      if (!uidRef.current) throw Error();
      guardarArranjosLocal(uidRef.current, novo);
      setEstado("Salvo neste aparelho");
    } catch {
      setEstado("Alterações pendentes");
      setErro(
        "O armazenamento local está indisponível. Mantenha esta tela aberta até sincronizar.",
      );
    }
    setArranjos(novo);
  }, []);
  const definirLayout = useCallback(
    (blocos: Layout) => {
      const a = atualRef.current;
      if (a)
        alterar({
          ...a,
          trabalho: { ...a.trabalho, [chave]: blocos },
          escolha: { ...a.escolha, [chave]: "custom" },
        });
    },
    [alterar, chave],
  );
  const cancelar = useCallback(() => {
    arrastoRef.current = null;
    candidatoRef.current = null;
    setPreview(null);
    setAtivo(null);
  }, []);
  const fecharRef = useRef(onFechar);
  fecharRef.current = onFechar;
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const mq = window.matchMedia("(max-width: 900px)");
    const atualizar = () => {
      setMobile(mq.matches);
      cancelar();
    };
    atualizar();
    mq.addEventListener("change", atualizar);
    return () => {
      document.body.style.overflow = anterior;
      mq.removeEventListener("change", atualizar);
    };
  }, [cancelar]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (arrastoRef.current) cancelar();
      else if (telaCheia) setTelaCheia(null);
      else fecharRef.current();
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [cancelar, telaCheia]);
  const pronto = arranjos !== null;
  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setLargura(el.clientWidth));
    observer.observe(el);
    setLargura(el.clientWidth);
    return () => observer.disconnect();
  }, [pronto]);
  const passoX = (largura + ESPACO) / COLUNAS,
    passoY = ALTURA_LINHA + ESPACO;
  const mover = useCallback(
    (e: PointerEvent) => {
      const d = arrastoRef.current,
        a = atualRef.current;
      if (!d || !a || passoX <= 0) return;
      const dx = Math.round((e.clientX - d.x) / passoX),
        dy = Math.round(
          (e.clientY - d.y + (scrollRef.current?.scrollTop ?? 0) - d.scroll) /
            passoY,
        );
      let b = { ...d.base };
      if (d.modo === "mover") {
        b.x = limitar(b.x + dx, 0, 12 - b.w);
        b.y = limitar(b.y + dy, 0, 1000);
      } else {
        if (d.dir.includes("e")) b.w = limitar(d.base.w + dx, 3, 12 - b.x);
        if (d.dir.includes("s")) b.h = limitar(d.base.h + dy, 4, 40);
        if (d.dir.includes("w")) {
          const direita = d.base.x + d.base.w;
          b.x = limitar(d.base.x + dx, 0, direita - 3);
          b.w = direita - b.x;
        }
        if (d.dir.includes("n")) {
          const baixo = d.base.y + d.base.h;
          b.y = limitar(d.base.y + dy, 0, baixo - 4);
          b.h = baixo - b.y;
        }
      }
      candidatoRef.current = b;
      setPreview(acomodarBloco(a.trabalho[chave] ?? a.padrao, b));
    },
    [chave, passoX, passoY],
  );
  const soltar = useCallback(() => {
    const a = atualRef.current,
      b = candidatoRef.current;
    if (a && b) definirLayout(acomodarBloco(a.trabalho[chave] ?? a.padrao, b));
    cancelar();
  }, [cancelar, chave, definirLayout]);
  useEffect(() => {
    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", cancelar);
    return () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", cancelar);
    };
  }, [mover, soltar, cancelar]);
  function iniciar(
    e: React.PointerEvent,
    b: Bloco,
    modo: Arrasto["modo"],
    dir: Direcao = "se",
  ) {
    if (!editar || mobile || telaCheia || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    arrastoRef.current = {
      base: { ...b },
      modo,
      dir,
      x: e.clientX,
      y: e.clientY,
      scroll: scrollRef.current?.scrollTop ?? 0,
    };
    candidatoRef.current = null;
    setAtivo(b.id);
  }
  function teclado(e: React.KeyboardEvent, b: Bloco) {
    if (!editar || mobile || telaCheia || !e.key.startsWith("Arrow")) return;
    e.preventDefault();
    e.stopPropagation();
    const dx = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0,
      dy = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    const a = atualRef.current;
    if (a)
      definirLayout(
        acomodarBloco(
          a.trabalho[chave] ?? a.padrao,
          e.shiftKey
            ? { ...b, w: b.w + dx, h: b.h + dy }
            : { ...b, x: b.x + dx, y: b.y + dy },
        ),
      );
  }
  const layout = arranjos
    ? (arranjos.trabalho[chave] ?? arranjos.padrao)
    : null;
  function aplicar(id: string) {
    if (!arranjos) return;
    const blocos = blocosDoArranjo(arranjos, id);
    if (blocos)
      alterar({
        ...arranjos,
        trabalho: { ...arranjos.trabalho, [chave]: blocos },
        escolha: { ...arranjos.escolha, [chave]: id },
      });
  }
  function visibilidade(b: Bloco) {
    if (!layout) return;
    const novo = { ...b, oculto: !b.oculto };
    definirLayout(
      novo.oculto
        ? layout.map((c) => (c.id === b.id ? novo : c))
        : acomodarBloco(layout, novo),
    );
    if (telaCheia === b.id) setTelaCheia(null);
  }
  function salvarNome() {
    if (!arranjos || !layout) return;
    const nome = window
      .prompt("Nome do arranjo:", `Meu arranjo ${arranjos.salvos.length + 1}`)
      ?.trim();
    if (!nome) return;
    const id = novoIdArranjo();
    alterar({
      ...arranjos,
      salvos: [
        ...arranjos.salvos,
        { id, nome: nome.slice(0, 80), blocos: layout.map((b) => ({ ...b })) },
      ],
      escolha: { ...arranjos.escolha, [chave]: id },
    });
  }
  function aplicarTodos() {
    if (
      !arranjos ||
      !layout ||
      !window.confirm(
        "Aplicar este layout a todos os tópicos? Os ajustes individuais serão substituídos.",
      )
    )
      return;
    alterar({
      ...arranjos,
      padrao: layout.map((b) => ({ ...b })),
      trabalho: {},
      escolha: {},
      escolhaGlobal: undefined,
    });
  }
  function excluir() {
    if (!arranjos || !window.confirm("Excluir este arranjo salvo?")) return;
    const id = arranjos.escolha[chave];
    alterar({
      ...arranjos,
      salvos: arranjos.salvos.filter((s) => s.id !== id),
      escolha: Object.fromEntries(
        Object.entries(arranjos.escolha).map(([k, v]) => [
          k,
          v === id ? "custom" : v,
        ]),
      ),
      escolhaGlobal:
        arranjos.escolhaGlobal === id ? undefined : arranjos.escolhaGlobal,
    });
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
        return <QuizBloco topico={topico} onSalvarTopico={onSalvarTopico} />;
    }
  }
  const exibido = preview ?? layout;
  const visiveis = exibido?.filter((b) => !b.oculto) ?? [];
  const altura =
    Math.max(4, ...visiveis.map((b) => b.y + b.h)) * passoY - ESPACO;
  const escolha =
    arranjos?.escolha[chave] ?? arranjos?.escolhaGlobal ?? "custom";
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="workspace-titulo"
      tabIndex={-1}
      className={`workspace ${editar ? "is-editing" : ""}`}
    >
      <header className="ws-heading">
        <div className="ws-identity">
          <span className="brand-mark">
            <Icon name="book" />
          </span>
          <div>
            <span className="eyebrow">SEU ESPAÇO DE ESTUDO</span>
            <h2 id="workspace-titulo">{topico.titulo}</h2>
          </div>
        </div>
        <div className="ws-heading-actions">
          <span role="status" className="ws-save-status">
            {estado}
          </span>
          <ThemeToggle />
          <button className="ws-close" onClick={onFechar}>
            <Icon name="close" size={17} />
            <span>Fechar expansão</span>
            <kbd>Esc</kbd>
          </button>
        </div>
      </header>
      <div className="ws-toolbar">
        <label>
          Layout{" "}
          <select
            aria-label="Layout do espaço de estudo"
            value={escolha}
            disabled={!layout}
            onChange={(e) => aplicar(e.target.value)}
          >
            <option value="custom">Personalizado</option>
            <optgroup label="Layouts prontos">
              {PRESETS.map((p) => (
                <option key={p.nome} value={presetId(p.nome)}>
                  {p.nome}
                </option>
              ))}
            </optgroup>
            {!!arranjos?.salvos.length && (
              <optgroup label="Meus layouts">
                {arranjos.salvos.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        {!mobile && (
          <button
            className={editar ? "selected" : ""}
            aria-pressed={editar}
            onClick={() => {
              cancelar();
              setEditar((v) => !v);
            }}
          >
            <Icon name="settings" size={16} />
            {editar ? "Concluir edição" : "Editar layout"}
          </button>
        )}
        <button
          disabled={!layout || !!telaCheia}
          onClick={() => layout && definirLayout(organizarWorkspace(layout))}
        >
          <Icon name="chart" size={16} />
          Organizar blocos
        </button>
        <button
          disabled={!podeDesfazer}
          onClick={() => {
            if (anteriorRef.current) {
              alterar(anteriorRef.current, false);
              setPodeDesfazer(false);
            }
          }}
        >
          Desfazer
        </button>
        <details className="ws-options">
          <summary>Mais opções</summary>
          <div className="ws-options-menu">
            <button disabled={!layout} onClick={salvarNome}>
              Salvar layout com nome
            </button>
            <button disabled={!layout} onClick={aplicarTodos}>
              Aplicar a todos os tópicos
            </button>
            {arranjos?.salvos.some((s) => s.id === escolha) && (
              <button onClick={excluir}>Excluir layout salvo</button>
            )}
            <span>Blocos visíveis</span>
            {layout?.map((b) => (
              <label key={b.id}>
                <input
                  type="checkbox"
                  checked={!b.oculto}
                  onChange={() => visibilidade(b)}
                />
                {TIPOS[b.id].rotulo}
              </label>
            ))}
          </div>
        </details>
      </div>
      {erro && (
        <div className="ws-notice" role="alert">
          {erro}
          <button onClick={() => void sincronizar()}>Tentar sincronizar</button>
        </div>
      )}
      <nav className="ws-tabs" aria-label="Foco nos blocos">
        <button aria-pressed={!telaCheia} onClick={() => setTelaCheia(null)}>
          Todos os blocos
        </button>
        {layout
          ?.filter((b) => !b.oculto)
          .map((b) => (
            <button
              key={b.id}
              aria-pressed={telaCheia === b.id}
              onClick={() => {
                cancelar();
                setTelaCheia(b.id);
              }}
            >
              <Icon name={ICONES[b.id]} size={15} />
              {TIPOS[b.id].rotulo}
            </button>
          ))}
      </nav>
      <div className="ws-context">
        <span>
          {telaCheia
            ? `${TIPOS[telaCheia].rotulo} em foco. Pressione Esc para restaurar a grade.`
            : editar && !mobile
              ? "Arraste pelo título. Use as bordas para redimensionar. No teclado: setas para mover e Shift + setas para redimensionar."
              : "Escolha um bloco para focar ou combine os materiais do seu jeito."}
        </span>
        {telaCheia && (
          <button onClick={() => setTelaCheia(null)}>
            Restaurar grade <Icon name="focus" size={15} />
          </button>
        )}
      </div>
      <div
        ref={scrollRef}
        className={`ws-scroll ${telaCheia ? "is-maximized" : ""}`}
      >
        {!layout && (
          <p role="status" className="p-6">
            Preparando seu espaço…
          </p>
        )}
        {layout && !visiveis.length && (
          <div className="ws-empty">
            <Icon name="book" size={34} />
            <h3>Seu espaço está em branco.</h3>
            <p>Reative os blocos em Mais opções para continuar.</p>
            <button
              onClick={() =>
                definirLayout(
                  organizarWorkspace(
                    layout.map((b) => ({ ...b, oculto: false })),
                  ),
                )
              }
            >
              Mostrar todos os blocos
            </button>
          </div>
        )}
        {layout && (
          <div
            ref={areaRef}
            className={`ws-grid ${mobile ? "is-mobile" : ""} ${telaCheia ? "is-maximized" : ""}`}
            style={!mobile && !telaCheia ? { height: altura } : undefined}
          >
            {exibido?.map((b) => (
              <section
                key={b.id}
                hidden={!!b.oculto || (!!telaCheia && b.id !== telaCheia)}
                aria-label={`Bloco ${TIPOS[b.id].rotulo}`}
                className={`ws-panel ${ativo === b.id ? "is-dragging" : ""}`}
                style={
                  mobile || telaCheia
                    ? undefined
                    : {
                        position: "absolute",
                        left: b.x * passoX,
                        top: b.y * passoY,
                        width: Math.max(0, b.w * passoX - ESPACO),
                        height: b.h * passoY - ESPACO,
                      }
                }
              >
                <header
                  className="ws-panel-heading"
                  onDoubleClick={(e) => {
                    if (!(e.target as HTMLElement).closest("button")) {
                      cancelar();
                      setTelaCheia((t) => (t === b.id ? null : b.id));
                    }
                  }}
                >
                  <button
                    className="ws-panel-title"
                    onPointerDown={(e) => iniciar(e, b, "mover")}
                    onKeyDown={(e) => teclado(e, b)}
                    onClick={() => {
                      if (!editar)
                        setTelaCheia((t) => (t === b.id ? null : b.id));
                    }}
                    aria-label={
                      editar
                        ? `Mover ${TIPOS[b.id].rotulo}`
                        : `Focar ${TIPOS[b.id].rotulo}`
                    }
                    title={
                      editar
                        ? "Setas: mover · Shift + setas: redimensionar"
                        : "Focar neste bloco"
                    }
                  >
                    <Icon name={ICONES[b.id]} size={17} />
                    <h3>{TIPOS[b.id].rotulo}</h3>
                    {editar && !telaCheia && <span className="ws-grip">⠿</span>}
                  </button>
                  <div className="ws-panel-actions">
                    <button
                      onClick={() => {
                        cancelar();
                        setTelaCheia((t) => (t === b.id ? null : b.id));
                      }}
                      aria-label={`${telaCheia === b.id ? "Restaurar" : "Maximizar"} ${TIPOS[b.id].rotulo}`}
                      title={
                        telaCheia === b.id
                          ? "Restaurar grade"
                          : "Maximizar bloco"
                      }
                    >
                      <Icon name="focus" size={16} />
                    </button>
                    <button
                      onClick={() => visibilidade(b)}
                      aria-label={`Ocultar ${TIPOS[b.id].rotulo}`}
                      title="Ocultar bloco"
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </div>
                </header>
                <div className="ws-panel-content">{conteudo(b.id)}</div>
                {editar &&
                  !mobile &&
                  !telaCheia &&
                  DIRECOES.map((dir) => (
                    <span
                      key={dir}
                      aria-hidden="true"
                      title="Arrastar para redimensionar"
                      className={`ws-resize ws-resize-${dir}`}
                      onPointerDown={(e) => iniciar(e, b, "redimensionar", dir)}
                    />
                  ))}
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
