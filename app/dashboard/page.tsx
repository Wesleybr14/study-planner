"use client";
import { apiFetch } from "@/lib/api-client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { labelPrazo, corPrazo, formatarData } from "@/lib/prazo";
import { estaVencido } from "@/lib/revisao";
import Icon from "@/components/Icon";
import Hoje from "@/components/Hoje";
import { identificarTopicos } from "@/lib/models";
import AppShell from "@/components/AppShell";

type Roteiro = {
  id: string;
  tema: string;
  descricao: string;
  topicos: any[];
  progresso: number;
  prazo: string | null;
  tags?: string[];
  criado_em: string;
  planejamento?: { horasSemana?: number; diasSemana?: number[] };
};

export default function Dashboard() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [nivel, setNivel] = useState("iniciante");
  const [objetivo, setObjetivo] = useState("");
  const [idioma, setIdioma] = useState("Português");
  const [horasSemana, setHorasSemana] = useState(7);
  const [diasSemana, setDiasSemana] = useState([1, 2, 3, 4, 5]);
  const [tema, setTema] = useState("");
  const [prazo, setPrazo] = useState("");
  const [tags, setTags] = useState("");
  const [gerando, setGerando] = useState(false);
  const [roteiros, setRoteiros] = useState<Roteiro[]>([]);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else carregarRoteiros();
    });

    // Permite chegar no formulário via /dashboard#novo (ex.: botão "Novo").
    if (window.location.hash === "#novo") {
      setTimeout(
        () =>
          document
            .getElementById("novo")
            ?.scrollIntoView({ behavior: "smooth" }),
        100,
      );
    }
  }, [router]);

  async function carregarRoteiros() {
    const { data, error } = await supabase
      .from("roteiros")
      .select("*")
      .order("criado_em", { ascending: false });
    if (error)
      setErro("Não foi possível carregar seus roteiros: " + error.message);
    else setRoteiros(data ?? []);
    setCarregando(false);
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (!tema.trim()) return;
    setGerando(true);
    setErro("");

    try {
      const res = await apiFetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tema,
          nivel,
          objetivo,
          idioma,
          horasSemana,
          prazo,
        }),
      });
      const plano = await res.json();
      if (!res.ok) throw new Error(plano.erro ?? "Erro ao gerar");

      const { data: auth } = await supabase.auth.getSession();
      const userId = auth.session?.user.id;

      const { error } = await supabase.from("roteiros").insert({
        user_id: userId,
        tema: plano.tema,
        descricao: plano.descricao,
        topicos: identificarTopicos(plano.topicos),
        planejamento: { nivel, objetivo, idioma, horasSemana, diasSemana },
        progresso: 0,
        prazo: prazo || null,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
      });

      if (error) throw new Error(error.message);
      setTema("");
      setPrazo("");
      setTags("");
      carregarRoteiros();
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setGerando(false);
    }
  }

  const revisoesPendentes = roteiros.reduce(
    (acc, r) =>
      acc +
      (r.topicos ?? []).reduce(
        (a: number, t: any) =>
          a +
          (t.flashcards ?? []).filter((f: any) =>
            estaVencido({
              ease: f.ease ?? 2.5,
              intervalo: f.intervalo ?? 0,
              reps: f.reps ?? 0,
              proxima: f.proxima ?? null,
            }),
          ).length,
        0,
      ),
    0,
  );

  const roteirosFiltrados = roteiros.filter((r) => {
    const q = filtro.toLowerCase().trim();
    if (q.startsWith("#")) {
      const tag = q.slice(1);
      return (r.tags ?? []).some((t) => t.toLowerCase().includes(tag));
    }
    if (!q) return true;
    return (
      (r.tema || "").toLowerCase().includes(q) ||
      (r.descricao || "").toLowerCase().includes(q) ||
      (r.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  });

  const todasTags = Array.from(
    new Set(roteiros.flatMap((r) => r.tags ?? [])),
  ).sort();

  return (
    <AppShell>
      <header className="dashboard-welcome">
        <div>
          <span className="eyebrow">SEU ESPAÇO DE APRENDIZADO</span>
          <h1>O que vamos descobrir hoje?</h1>
          <p>Organize suas ideias. Encontre seu ritmo. Vá mais longe.</p>
        </div>
        <a href="#novo" className="primary-button">
          <Icon name="plus" size={18} /> Novo roteiro
        </a>
      </header>
      <div className="study-overview" aria-label="Resumo dos estudos">
        <div>
          <span className="overview-icon">
            <Icon name="book" />
          </span>
          <span>
            <small>Roteiros na sua biblioteca</small>
            <strong>{roteiros.length.toString().padStart(2, "0")}</strong>
          </span>
        </div>
        <div>
          <span className="overview-icon peach">
            <Icon name="check" />
          </span>
          <span>
            <small>Tópicos concluídos</small>
            <strong>
              {roteiros
                .reduce(
                  (n, r) => n + r.topicos.filter((t) => t.concluido).length,
                  0,
                )
                .toString()
                .padStart(2, "0")}
            </strong>
          </span>
        </div>
        <div>
          <span className="overview-icon lavender">
            <Icon name="repeat" />
          </span>
          <span>
            <small>Cards para revisar</small>
            <strong>{revisoesPendentes.toString().padStart(2, "0")}</strong>
          </span>
        </div>
      </div>

      <Hoje roteiros={roteiros} />
      {carregando && <p role="status">Carregando seus estudos…</p>}
      {revisoesPendentes > 0 && (
        <Link
          href="/revisao"
          className="mb-6 flex items-center justify-between rounded-xl border border-purple-200 bg-purple-50 p-4 text-sm hover:bg-purple-100 dark:border-purple-800 dark:bg-purple-900/30 dark:hover:bg-purple-900/50"
        >
          <span className="font-medium text-purple-800 dark:text-purple-200">
            🔁 {revisoesPendentes} {revisoesPendentes === 1 ? "card" : "cards"}{" "}
            para revisar hoje
          </span>
          <span className="text-purple-700 dark:text-purple-300">
            Revisar →
          </span>
        </Link>
      )}

      <div className="dashboard-grid">
        <form onSubmit={criar} id="novo" className="new-plan-card">
          <div className="new-plan-heading">
            <span className="overview-icon">
              <Icon name="spark" />
            </span>
            <div>
              <span className="eyebrow">DA CURIOSIDADE AO PLANO</span>
              <h2>Seu próximo aprendizado</h2>
            </div>
          </div>
          <label htmlFor="tema" className="mb-2 block font-medium">
            Sobre o que você quer estudar?
          </label>
          <input
            id="tema"
            required
            maxLength={500}
            value={tema}
            onChange={(e) => setTema(e.target.value)}
            placeholder="Ex: Inteligência Artificial, Finanças, Inglês..."
            className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <details className="plan-options">
            <summary>
              Personalizar meu plano <span>Nível, rotina e preferências</span>
            </summary>
            <fieldset className="mb-4 space-y-3">
              <legend className="font-medium">Seu perfil de estudo</legend>
              <label className="block text-sm">
                Nível atual
                <select
                  className="ml-2 rounded border p-2 dark:bg-slate-800"
                  value={nivel}
                  onChange={(e) => setNivel(e.target.value)}
                >
                  <option value="iniciante">Iniciante</option>
                  <option value="intermediario">Intermediário</option>
                  <option value="avancado">Avançado</option>
                </select>
              </label>
              <label className="block text-sm">
                Objetivo
                <input
                  className="mt-1 w-full rounded border p-2 dark:bg-slate-800"
                  value={objetivo}
                  maxLength={1000}
                  placeholder="Ex.: preparar para uma prova"
                  onChange={(e) => setObjetivo(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Idioma dos materiais
                <input
                  className="mt-1 w-full rounded border p-2 dark:bg-slate-800"
                  value={idioma}
                  required
                  maxLength={80}
                  onChange={(e) => setIdioma(e.target.value)}
                />
              </label>
              <label className="block text-sm">
                Horas por semana
                <input
                  className="ml-2 w-20 rounded border p-2 dark:bg-slate-800"
                  type="number"
                  min="0.5"
                  max="112"
                  step="0.5"
                  required
                  value={horasSemana}
                  onChange={(e) => setHorasSemana(Number(e.target.value))}
                />
              </label>
              <div
                className="flex flex-wrap gap-2"
                role="group"
                aria-label="Dias de estudo"
              >
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(
                  (dia, i) => (
                    <label
                      key={dia}
                      className="flex min-h-11 items-center gap-1"
                    >
                      <input
                        type="checkbox"
                        checked={diasSemana.includes(i)}
                        onChange={() =>
                          setDiasSemana((d) =>
                            d.includes(i)
                              ? d.filter((x) => x !== i)
                              : [...d, i],
                          )
                        }
                      />
                      {dia}
                    </label>
                  ),
                )}
              </div>
              {!diasSemana.length && (
                <p role="alert">Selecione pelo menos um dia.</p>
              )}
            </fieldset>
          </details>
          <div className="mb-3">
            <label
              htmlFor="prazo"
              className="mb-1 block text-sm text-slate-600 dark:text-slate-300"
            >
              Meta (opcional) — até quando quer terminar?
            </label>
            <input
              id="prazo"
              type="date"
              value={prazo}
              onChange={(e) => setPrazo(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>
          <div className="mb-3">
            <label
              htmlFor="tags"
              className="mb-1 block text-sm text-slate-600 dark:text-slate-300"
            >
              Tags (opcional) — separe por vírgula
            </label>
            <input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Ex: faculdade, exame, matemática"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          <button
            type="submit"
            disabled={gerando || !diasSemana.length}
            className="w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {gerando ? "Gerando..." : "Gerar roteiro"}
          </button>
          {gerando && (
            <p className="mt-2 text-sm text-slate-500">
              A IA está montando seu plano de estudos...
            </p>
          )}
          {erro && (
            <p role="alert" className="mt-2 text-sm text-red-500">
              {erro}{" "}
              <button type="button" onClick={carregarRoteiros}>
                Tentar carregar novamente
              </button>
            </p>
          )}
        </form>

        <section className="library-section space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="eyebrow">UM ASSUNTO DE CADA VEZ</span>
              <h2 className="library-title">
                Minha biblioteca <span>{roteiros.length}</span>
              </h2>
            </div>
            {roteiros.length > 0 && (
              <input
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                aria-label="Buscar roteiros"
                placeholder="Buscar por título, descrição ou #tag..."
                className="w-full sm:w-72 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800"
              />
            )}
          </div>
          {todasTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-400 dark:text-slate-500">
                🏷 Filtrar:
              </span>
              {todasTags.map((t) => (
                <button
                  key={t}
                  onClick={() => setFiltro(filtro === `#${t}` ? "" : `#${t}`)}
                  className={`rounded-full px-2 py-0.5 text-xs transition ${
                    filtro === `#${t}`
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                  }`}
                >
                  {t}
                </button>
              ))}
              {filtro && (
                <button
                  onClick={() => setFiltro("")}
                  className="text-xs text-slate-400 underline hover:text-slate-600 dark:hover:text-slate-300"
                >
                  limpar
                </button>
              )}
            </div>
          )}
          {roteiros.length === 0 ? (
            <div className="library-empty">
              <span className="empty-book">
                <Icon name="book" size={38} />
              </span>
              <h3>
                Todo aprendizado começa
                <br />
                com uma boa pergunta.
              </h3>
              <p>
                Sua biblioteca ainda está em branco.
                <br />
                Escolha um assunto e crie seu primeiro roteiro.
              </p>
              <a href="#novo">
                Começar minha jornada <Icon name="arrow" size={17} />
              </a>
            </div>
          ) : roteirosFiltrados.length === 0 ? (
            <p className="rounded-xl bg-white p-6 text-center text-slate-400 shadow dark:border dark:border-slate-800 dark:bg-slate-900 dark:text-slate-500">
              Nenhum roteiro encontrado para &quot;{filtro}&quot;.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {roteirosFiltrados.map((r) => (
                <button
                  key={r.id}
                  onClick={() => router.push(`/tema/${r.id}`)}
                  className="course-card"
                >
                  <div className="course-card-symbol">
                    <Icon name="book" size={22} />
                    <Icon name="arrow" size={19} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-semibold">{r.tema}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">
                      {r.progresso}%
                    </span>
                  </div>
                  <p className="course-description">
                    {r.descricao ||
                      `${r.topicos.length} tópicos para descobrir, no seu ritmo.`}
                  </p>
                  {(r.tags ?? []).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(r.tags ?? []).map((t) => (
                        <span
                          key={t}
                          className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                  {r.prazo && (
                    <p className={`mt-1 text-xs ${corPrazo(r.prazo)}`}>
                      {labelPrazo(r.prazo)} · meta {formatarData(r.prazo)}
                    </p>
                  )}
                  <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${r.progresso}%` }}
                    />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
