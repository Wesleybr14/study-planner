import type { SupabaseClient } from "@supabase/supabase-js";
export type SnapshotRoteiro = {
  topicos: unknown;
  versao?: number;
  [campo: string]: unknown;
};
/** Controle otimista funciona também antes da migração 7, comparando o JSON persistido. */
export async function atualizarRoteiro(
  db: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
  anterior: SnapshotRoteiro,
) {
  if ("planejamento" in patch && !("planejamento" in anterior))
    throw new Error(
      "Para salvar a disponibilidade, aplique a migração 7 no Supabase. Seus roteiros continuam acessíveis.",
    );
  let query = db.from("roteiros").update(patch).eq("id", id);
  query =
    typeof anterior.versao === "number"
      ? query.eq("versao", anterior.versao)
      : query.eq("topicos", JSON.stringify(anterior.topicos));
  const { data, error } = await query.select("*").single();
  if (error || !data)
    throw new Error(
      error?.code === "PGRST116"
        ? "Este roteiro mudou em outra aba. Preserve seu rascunho e recarregue para evitar sobrescrever alterações."
        : (error?.message ?? "Não foi possível salvar o roteiro."),
    );
  return data as SnapshotRoteiro;
}
