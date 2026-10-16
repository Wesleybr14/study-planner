import { diasRestantes } from "./prazo";

type TopicoCronograma = {
  titulo: string;
  duracaoEstimada?: string;
  concluido?: boolean;
};

export type ItemDia = { indice: number; titulo: string; horas: number };
export type Dia = { data: Date; itens: ItemDia[] };

/** Extrai um número de horas de textos como "4 horas", "8 horas", "2h". */
export function horasDeDuracao(texto?: string): number {
  if (!texto) return 4;
  const m = texto.match(/(\d+(?:[.,]\d+)?)/);
  if (m) return parseFloat(m[1].replace(",", "."));
  return 4;
}

function addDias(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

/**
 * Distribui os tópicos pendentes pelos dias até a data da meta.
 * Sem prazo, sugere avançar ao longo dos próximos dias (1 tópico por dia).
 */
export function calcularCronograma(roteiro: {
  prazo?: string | null;
  topicos: TopicoCronograma[];
}) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const restantes = roteiro.topicos
    .map((t, i) => ({
      indice: i,
      titulo: t.titulo,
      horas: horasDeDuracao(t.duracaoEstimada),
      concluido: !!t.concluido,
    }))
    .filter((t) => !t.concluido);

  const diasRest = roteiro.prazo ? diasRestantes(roteiro.prazo) : null;
  const atrasado = diasRest !== null && diasRest < 0;
  const concluido = restantes.length === 0;

  // Quantos dias úteis temos até a meta (incluindo hoje)
  let dias = Math.max(1, diasRest === null ? restantes.length : diasRest + 1);
  if (atrasado) dias = 1; // tudo pra hoje

  const totalHoras = restantes.reduce((s, t) => s + t.horas, 0);
  const horasPorDia = totalHoras / dias;

  // Distribui os tópicos mantendo cada um inteiro em um dia
  const lista: Dia[] = [];
  let diaIdx = 0;
  let carga = 0;
  for (const t of restantes) {
    if (carga > 0 && carga + t.horas > horasPorDia && diaIdx < dias - 1) {
      diaIdx++;
      carga = 0;
    }
    if (!lista[diaIdx]) lista[diaIdx] = { data: addDias(hoje, diaIdx), itens: [] };
    lista[diaIdx].itens.push({ indice: t.indice, titulo: t.titulo, horas: t.horas });
    carga += t.horas;
  }

  return {
    concluido,
    atrasado,
    diasRestantes: diasRest,
    horasPorDia: +horasPorDia.toFixed(1),
    dias: lista,
    hoje: lista[0]?.itens ?? [],
  };
}

export function formatarDataCurta(d: Date): string {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
