import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export type Categoria = "ia" | "busca" | "video";
export async function authorize(req: NextRequest) {
  const token = req.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new ApiError("Faça login para continuar.", 401);
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new ApiError("Serviço não configurado.", 503);
  const db = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user)
    throw new ApiError("Sessão expirada. Entre novamente.", 401);
  return db;
}
// Chamar só depois de validar o pedido: pedido inválido não gasta cota.
export async function consumirCota(
  db: Awaited<ReturnType<typeof authorize>>,
  categoria: Categoria,
) {
  const quota = await db.rpc("consumir_cota", { categoria });
  if (quota.error)
    throw new ApiError(
      "Serviço temporariamente indisponível. Verifique as migrações 7 e 8.",
      503,
    );
  if (!quota.data)
    throw new ApiError("Limite de uso atingido. Tente na próxima hora.", 429);
}
export function text(
  value: unknown,
  name: string,
  max = 500,
  optional = false,
): string {
  if (optional && (value === undefined || value === "")) return "";
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new ApiError(`${name}: informe texto de até ${max} caracteres.`);
  return value.trim();
}
export async function body(req: NextRequest) {
  if (Number(req.headers.get("content-length")) > 16000)
    throw new ApiError("Pedido muito grande.", 413);
  const raw = await req.text();
  if (raw.length > 16000) throw new ApiError("Pedido muito grande.", 413);
  try {
    const value = JSON.parse(raw);
    if (!value || Array.isArray(value) || typeof value !== "object")
      throw Error();
    return value;
  } catch {
    throw new ApiError("Pedido inválido.");
  }
}
export function failure(error: unknown) {
  const status = error instanceof ApiError ? error.status : 502;
  return NextResponse.json(
    {
      erro:
        error instanceof ApiError
          ? error.message
          : "Não foi possível concluir. Tente novamente.",
    },
    { status },
  );
}
