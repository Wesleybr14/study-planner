import { diasRestantes } from "./prazo";
type TopicoCronograma = {
  titulo: string;
  duracaoEstimada?: string;
  concluido?: boolean;
};
export type Planejamento = {
  horasSemana?: number;
  diasSemana?: number[];
  nivel?: string;
  objetivo?: string;
  idioma?: string;
};
export type ItemDia = { indice: number; titulo: string; horas: number };
export type Dia = { data: Date; itens: ItemDia[] };
export function horasDeDuracao(texto?: string): number {
  if (!texto) return 4;
  const s = texto.toLowerCase().replace(/,/g, ".");
  const horas = s.match(/(\d+(?:\.\d+)?)\s*(?:horas?|h)\b/);
  const minutos = s.match(/(\d+(?:\.\d+)?)\s*(?:minutos?|min|m)\b/);
  if (horas || minutos)
    return Math.max(
      1 / 60,
      Number(horas?.[1] ?? 0) + Number(minutos?.[1] ?? 0) / 60,
    );
  return Math.max(1 / 60, Number(s.match(/\d+(?:\.\d+)?/)?.[0] ?? 4));
}
export function calcularCronograma(
  roteiro: {
    prazo?: string | null;
    topicos: TopicoCronograma[];
    planejamento?: Planejamento | null;
  },
  agora = new Date(),
) {
  const hoje = new Date(agora);
  hoje.setHours(0, 0, 0, 0);
  const restantes = roteiro.topicos
    .map((t, i) => ({
      indice: i,
      titulo: t.titulo,
      horas: horasDeDuracao(t.duracaoEstimada),
      concluido: t.concluido,
    }))
    .filter((t) => !t.concluido);
  const diasRest = roteiro.prazo ? diasRestantes(roteiro.prazo, hoje) : null;
  const atrasado = diasRest !== null && diasRest < 0;
  const diasSemana = [
    ...new Set(roteiro.planejamento?.diasSemana ?? [0, 1, 2, 3, 4, 5, 6]),
  ].filter((d) => Number.isInteger(d) && d >= 0 && d <= 6);
  if (!diasSemana.length) diasSemana.push(1, 2, 3, 4, 5);
  const horasSemana = Math.min(
    112,
    Math.max(0.5, roteiro.planejamento?.horasSemana ?? 7),
  );
  const capacidadeDia = horasSemana / diasSemana.length;
  const totalHoras = restantes.reduce((sum, t) => sum + t.horas, 0);
  const disponiveis: Date[] = [];
  const horizonte =
    diasRest !== null
      ? Math.min(3650, Math.max(0, diasRest) + 1)
      : Math.min(3650, Math.ceil(totalHoras / horasSemana) * 7 + 7);
  for (let i = 0; i < horizonte; i++) {
    const d = new Date(hoje);
    d.setDate(d.getDate() + i);
    if (diasSemana.includes(d.getDay())) disponiveis.push(d);
  }
  const capacidade = disponiveis.length * capacidadeDia;
  const inviavel = atrasado || capacidade + 0.001 < totalHoras;
  const lista: Dia[] = [];
  let dia = 0,
    carga = 0;
  for (const t of restantes) {
    let horas = t.horas;
    while (horas > 0.0001 && dia < disponiveis.length) {
      const parte = Math.min(horas, capacidadeDia - carga);
      if (!lista[dia]) lista[dia] = { data: disponiveis[dia], itens: [] };
      lista[dia].itens.push({
        indice: t.indice,
        titulo: t.titulo,
        horas: Math.round(parte * 100) / 100,
      });
      horas -= parte;
      carga += parte;
      if (carga >= capacidadeDia - 0.0001) {
        dia++;
        carga = 0;
      }
    }
  }
  return {
    concluido: restantes.length === 0,
    atrasado,
    inviavel,
    horasNaoAgendadas: Math.max(
      0,
      Math.round((totalHoras - capacidade) * 10) / 10,
    ),
    diasRestantes: diasRest,
    horasPorDia: Math.round(capacidadeDia * 10) / 10,
    dias: lista,
    hoje: lista.find((d) => d.data.getTime() === hoje.getTime())?.itens ?? [],
  };
}
export function formatarDataCurta(d: Date) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
