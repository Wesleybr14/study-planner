// Utilitários para metas/prazos de estudo.

/** Dias restantes até a data (negativo = atrasado, null = sem prazo). */
export function diasRestantes(
  prazo?: string | null,
  agora = new Date(),
): number | null {
  if (!prazo) return null;
  const hoje = new Date(agora);
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(`${prazo}T00:00:00`);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000);
}

/** Texto amigável sobre o prazo. */
export function labelPrazo(prazo?: string | null): string | null {
  const d = diasRestantes(prazo);
  if (d === null) return null;
  if (d > 1) return `Faltam ${d} dias`;
  if (d === 1) return "Falta 1 dia";
  if (d === 0) return "É hoje!";
  return `Atrasado ${Math.abs(d)} dia(s)`;
}

/** Cor (classe Tailwind) conforme a urgência. */
export function corPrazo(prazo?: string | null): string {
  const d = diasRestantes(prazo);
  if (d === null) return "text-slate-500 dark:text-slate-400";
  if (d < 0) return "text-red-600 dark:text-red-400";
  if (d <= 3) return "text-orange-500 dark:text-orange-400";
  return "text-slate-500 dark:text-slate-400";
}

/** Data formatada em pt-BR. */
export function formatarData(prazo?: string | null): string {
  if (!prazo) return "";
  return new Date(`${prazo}T00:00:00`).toLocaleDateString("pt-BR");
}
