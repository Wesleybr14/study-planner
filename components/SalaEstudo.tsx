"use client";
import { useEffect, useState } from "react";
import { useDialog } from "./useDialog";
import Icon from "./Icon";
import VideosBloco from "./blocos/VideosBloco";
import LivrosBloco from "./blocos/LivrosBloco";
import ArtigosBloco from "./blocos/ArtigosBloco";
import ArquivosBloco from "./blocos/ArquivosBloco";
import NotasBloco from "./blocos/NotasBloco";
import FlashcardsBloco from "./blocos/FlashcardsBloco";
import QuizBloco from "./blocos/QuizBloco";
import Cronometro from "./Cronometro";
const MATERIAIS = ["Vídeos", "Livros", "Artigos", "Meus arquivos"];
const CADERNO = ["Notas", "Flashcards", "Quiz"];
export default function SalaEstudo({
  roteiro,
  indice,
  onSelecionar,
  onFechar,
  onAvancado,
  onSalvarTopico,
  erro,
  salvando,
}: {
  roteiro: any;
  indice: number;
  onSelecionar: (i: number) => void;
  onFechar: () => void;
  onAvancado: () => void;
  onSalvarTopico: (patch: Record<string, any>) => Promise<void>;
  erro: string;
  salvando: boolean;
}) {
  const ref = useDialog<HTMLDivElement>(true);
  const [nav, setNav] = useState(false);
  const [largura, setLargura] = useState(36);
  const [pronto, setPronto] = useState(false);
  const t = roteiro.topicos[indice];
  const chave = `sala:${roteiro.id}`;
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem(chave) ?? "null");
      if (p) {
        setNav(!!p.nav);
        setLargura(Math.max(28, Math.min(50, Number(p.largura) || 36)));
      }
    } catch {}
    setPronto(true);
  }, [chave]);
  useEffect(() => {
    if (pronto)
      try {
        localStorage.setItem(chave, JSON.stringify({ nav, largura }));
      } catch {}
  }, [chave, nav, largura, pronto]);
  useEffect(() => {
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, []);
  const progresso = roteiro.topicos.filter((p: any) => p.concluido).length;
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-label="Sala de estudo"
      className="study-room"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          if (nav) setNav(false);
          else onFechar();
        }
      }}
    >
      <header className="room-header">
        <button
          aria-expanded={nav}
          aria-controls="room-outline"
          onClick={() => setNav(!nav)}
        >
          <Icon name="book" size={18} />
          Roteiro
        </button>
        <div className="room-title">
          <span className="eyebrow">
            {roteiro.tema} · TÓPICO {indice + 1} DE {roteiro.topicos.length}
          </span>
          <h1>{t.titulo}</h1>
        </div>
        <button onClick={onAvancado} title="Organizar livremente os blocos">
          Modo de blocos
        </button>
        <button onClick={onFechar} aria-label="Voltar à visão geral">
          <Icon name="close" size={18} />
        </button>
      </header>
      {erro && (
        <div role="alert" className="room-error">
          {erro}
        </div>
      )}
      <div className="room-body">
        <aside id="room-outline" className="room-outline" hidden={!nav}>
          <div className="room-outline-title">
            <strong>Seu caminho</strong>
            <span>
              {progresso}/{roteiro.topicos.length} concluídos
            </span>
          </div>
          <progress value={progresso} max={roteiro.topicos.length} />
          <nav aria-label="Tópicos do roteiro">
            {roteiro.topicos.map((p: any, i: number) => (
              <button
                key={p.id}
                aria-current={indice === i ? "step" : undefined}
                onClick={() => {
                  onSelecionar(i);
                  if (window.matchMedia("(max-width: 760px)").matches)
                    setNav(false);
                }}
              >
                <span>
                  {p.concluido ? (
                    <Icon name="check" size={16} />
                  ) : (
                    String(i + 1).padStart(2, "0")
                  )}
                </span>
                <span>
                  {p.titulo}
                  <small>
                    {p.concluido ? "Concluído" : (p.nivel ?? "A estudar")}
                  </small>
                </span>
              </button>
            ))}
          </nav>
        </aside>
        <div
          className="room-work"
          style={{ "--notebook-width": `${largura}%` } as React.CSSProperties}
        >
          <div className="room-session">
            <details>
              <summary>
                Tempo de foco <Icon name="clock" size={15} />
              </summary>
              <div className="room-timer">
                <Cronometro
                  key={t.id}
                  roteiroId={roteiro.id}
                  topicoIndex={t.recursoIndex}
                />
              </div>
            </details>
            <span role="status">
              {salvando ? "Salvando…" : "Seu espaço, no seu ritmo"}
            </span>
            <label className="room-size">
              Caderno{" "}
              <input
                aria-label="Largura do caderno"
                type="range"
                min="28"
                max="50"
                value={largura}
                onChange={(e) => setLargura(Number(e.target.value))}
              />
            </label>
            <button
              disabled={salvando}
              onClick={() =>
                void onSalvarTopico({ concluido: !t.concluido }).catch(() => {})
              }
            >
              <Icon name="check" size={15} />
              {t.concluido ? "Marcar como pendente" : "Concluir tópico"}
            </button>
          </div>
          <Paineis
            key={t.id}
            topico={t}
            roteiroId={roteiro.id}
            onSalvarTopico={onSalvarTopico}
          />
          <footer className="room-footer">
            <button
              disabled={indice === 0}
              onClick={() => onSelecionar(indice - 1)}
            >
              ← Anterior
            </button>
            <span>
              {indice + 1} de {roteiro.topicos.length}
            </span>
            <button
              disabled={indice === roteiro.topicos.length - 1}
              onClick={() => onSelecionar(indice + 1)}
            >
              Próximo tópico →
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
function Paineis({
  topico,
  roteiroId,
  onSalvarTopico,
}: {
  topico: any;
  roteiroId: string;
  onSalvarTopico: (patch: Record<string, any>) => Promise<void>;
}) {
  const chave = `estudo-paineis:${roteiroId}:${topico.id}`;
  const [material, setMaterial] = useState(0),
    [caderno, setCaderno] = useState(0);
  const [visitados, setVisitados] = useState<number[]>([]),
    [praticas, setPraticas] = useState<number[]>([0]);
  const [pronto, setPronto] = useState(false);
  const [mobileAba, setMobileAba] = useState("material");
  useEffect(() => {
    let m = 0,
      c = 0;
    try {
      const p = JSON.parse(localStorage.getItem(chave) ?? "null");
      if (p) {
        m =
          Number.isInteger(p.material) && p.material >= 0 && p.material < 4
            ? p.material
            : 0;
        c =
          Number.isInteger(p.caderno) && p.caderno >= 0 && p.caderno < 3
            ? p.caderno
            : 0;
      }
    } catch {}
    setMaterial(m);
    setCaderno(c);
    setVisitados([m]);
    setPraticas([0, c]);
    setPronto(true);
  }, [chave]);
  useEffect(() => {
    if (pronto)
      try {
        localStorage.setItem(chave, JSON.stringify({ material, caderno }));
      } catch {}
  }, [material, caderno, chave, pronto]);
  return (
    <>
      <nav className="room-mobile-switch" aria-label="Área de estudo">
        <button
          aria-pressed={mobileAba === "material"}
          onClick={() => setMobileAba("material")}
        >
          Material
        </button>
        <button
          aria-pressed={mobileAba === "caderno"}
          onClick={() => setMobileAba("caderno")}
        >
          Caderno e prática
        </button>
      </nav>
      <div className={`room-panels mobile-${mobileAba}`}>
        <section className="room-material" aria-label="Material de estudo">
          <div className="room-panel-label">
            <Icon name="book" size={17} />
            <h2>Material de estudo</h2>
            <span>Leia. Assista. Explore.</span>
          </div>
          <nav className="room-tabs" aria-label="Tipo de material">
            {MATERIAIS.map((s, i) => (
              <button
                key={s}
                aria-pressed={material === i}
                onClick={() => {
                  setMaterial(i);
                  setVisitados((v) => (v.includes(i) ? v : [...v, i]));
                }}
              >
                {s}
              </button>
            ))}
          </nav>
          <div className="room-content">
            {!pronto && <p>Retomando seus materiais…</p>}
            {visitados.includes(0) && (
              <div hidden={material !== 0} className="room-video">
                <VideosBloco
                  topico={topico}
                  compacto
                  memoria={`${chave}:video`}
                />
              </div>
            )}
            {visitados.includes(1) && (
              <div hidden={material !== 1}>
                <LivrosBloco
                  topico={topico}
                  roteiroId={roteiroId}
                  indice={topico.recursoIndex}
                  compacto
                />
              </div>
            )}
            {visitados.includes(2) && (
              <div hidden={material !== 2}>
                <ArtigosBloco
                  topico={topico}
                  roteiroId={roteiroId}
                  indice={topico.recursoIndex}
                  compacto
                />
              </div>
            )}
            {visitados.includes(3) && (
              <div hidden={material !== 3}>
                <ArquivosBloco
                  roteiroId={roteiroId}
                  indice={topico.recursoIndex}
                />
              </div>
            )}
          </div>
        </section>
        <section className="room-notebook" aria-label="Caderno e prática">
          <div className="room-panel-label">
            <Icon name="keyboard" size={17} />
            <h2>Seu caderno</h2>
          </div>
          <nav className="room-tabs" aria-label="Ferramentas de estudo">
            {CADERNO.map((s, i) => (
              <button
                key={s}
                aria-pressed={caderno === i}
                onClick={() => {
                  setCaderno(i);
                  setPraticas((v) => (v.includes(i) ? v : [...v, i]));
                }}
              >
                {s}
              </button>
            ))}
          </nav>
          <div className="room-content">
            <div hidden={caderno !== 0}>
              <NotasBloco
                topico={topico}
                roteiroId={roteiroId}
                indice={topico.recursoIndex}
                onSalvarTopico={onSalvarTopico}
                mostrarCronometro={false}
              />
            </div>
            {praticas.includes(1) && (
              <div hidden={caderno !== 1}>
                <FlashcardsBloco
                  topico={topico}
                  onSalvarTopico={onSalvarTopico}
                />
              </div>
            )}
            {praticas.includes(2) && (
              <div hidden={caderno !== 2}>
                <QuizBloco topico={topico} onSalvarTopico={onSalvarTopico} />
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
