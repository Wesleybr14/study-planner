import { NextRequest, NextResponse } from "next/server";
import { gerarBuscas } from "@/lib/gemini";
import { authorize, consumirCota, body, text, failure, ApiError } from "@/lib/api-server";
export async function POST(req: NextRequest) {
  try {
    const db = await authorize(req);
    const d = await body(req);
    if (!Array.isArray(d.titulos) || !d.titulos.length || d.titulos.length > 30)
      throw new ApiError("Informe de 1 a 30 tópicos.");
    const titulos = d.titulos.map((t: unknown) => text(t, "Título"));
    await consumirCota(db, "ia");
    const value = await gerarBuscas(titulos);
    return NextResponse.json({ buscas: value });
  } catch (error) {
    return failure(error);
  }
}
