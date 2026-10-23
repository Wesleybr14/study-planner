import { NextRequest, NextResponse } from "next/server";
import { gerarBuscas } from "@/lib/gemini";
import { authorize, body, text, failure, ApiError } from "@/lib/api-server";
export async function POST(req: NextRequest) {
  try {
    await authorize(req, true);
    const d = await body(req);
    if (!Array.isArray(d.titulos) || !d.titulos.length || d.titulos.length > 30)
      throw new ApiError("Informe de 1 a 30 tópicos.");
    const value = await gerarBuscas(
      d.titulos.map((t: unknown) => text(t, "Título")),
    );
    return NextResponse.json({ buscas: value });
  } catch (error) {
    return failure(error);
  }
}
