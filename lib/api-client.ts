import { supabase } from "./supabase";
export async function apiFetch(input: string, init: RequestInit = {}) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session)
    throw new Error("Sessão expirada. Entre novamente.");
  const headers = new Headers(init.headers);
  headers.set("Authorization", `Bearer ${data.session.access_token}`);
  const response = await fetch(input, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.timeout(60000),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.erro ?? "Não foi possível concluir. Tente novamente.");
  }
  return response;
}
