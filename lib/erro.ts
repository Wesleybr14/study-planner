/** Mensagem legível de um erro capturado (o `catch` recebe `unknown`). */
export function mensagemDe(e: unknown, padrao = "Algo deu errado."): string {
  return e instanceof Error && e.message ? e.message : padrao;
}
