// Algoritmo de repetição espaçada (baseado no SM-2).
// O estado de cada flashcard é guardado no próprio objeto do flashcard.

export type EstadoRevisao = {
  ease: number; // fator de facilidade
  intervalo: number; // dias até a próxima revisão
  reps: number; // repetições bem-sucedidas seguidas
  proxima: string | null; // data (YYYY-MM-DD) da próxima revisão
};

export type Qualidade = "dificil" | "bom" | "facil";

export const ESTADO_INICIAL: EstadoRevisao = {
  ease: 2.5,
  intervalo: 0,
  reps: 0,
  proxima: null,
};

const NOTA: Record<Qualidade, number> = { dificil: 2, bom: 4, facil: 5 };

/** Data local em formato YYYY-MM-DD (sem fuso/UTC). */
export function isoLocal(data = new Date()): string {
  const x = new Date(data);
  x.setHours(0, 0, 0, 0);
  const a = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const d = String(x.getDate()).padStart(2, "0");
  return `${a}-${m}-${d}`;
}

/** Um card está vencido se nunca foi revisado ou se a data já passou. */
export function estaVencido(estado?: EstadoRevisao | null): boolean {
  if (!estado || !estado.proxima) return true;
  return estado.proxima <= isoLocal();
}

/** Aplica o SM-2 e devolve o novo estado do card. */
export function revisar(
  estado: EstadoRevisao,
  qualidade: Qualidade,
): EstadoRevisao {
  const q = NOTA[qualidade];
  let { ease, intervalo, reps } = estado;

  if (q < 3) {
    reps = 0;
    intervalo = 1;
  } else {
    reps += 1;
    if (reps === 1) intervalo = 1;
    else if (reps === 2) intervalo = 6;
    else intervalo = Math.round(intervalo * ease);
  }

  ease = ease + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (ease < 1.3) ease = 1.3;

  const proxima = new Date();
  proxima.setHours(0, 0, 0, 0);
  proxima.setDate(proxima.getDate() + intervalo);

  return {
    ease: +ease.toFixed(2),
    intervalo,
    reps,
    proxima: isoLocal(proxima),
  };
}

/** Texto amigável do intervalo agendado. */
export function textoIntervalo(intervalo: number): string {
  if (intervalo <= 1) return "amanhã";
  if (intervalo < 30) return `em ${intervalo} dias`;
  const meses = Math.round(intervalo / 30);
  return `em ~${meses} ${meses === 1 ? "mês" : "meses"}`;
}
