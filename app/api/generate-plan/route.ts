import { NextRequest, NextResponse } from "next/server";
import { gerarRoteiro } from "@/lib/gemini";
import { authorize, consumirCota, body, text, failure, ApiError } from "@/lib/api-server";
export async function POST(req: NextRequest) {
  try {
    const db = await authorize(req);
    const d = await body(req);
    if (
      d.horasSemana !== undefined &&
      (typeof d.horasSemana !== "number" ||
        !Number.isFinite(d.horasSemana) ||
        d.horasSemana < 0.5 ||
        d.horasSemana > 112)
    )
      throw new ApiError(
        "Disponibilidade deve ser de 0,5 a 112 horas semanais.",
      );
    if (
      d.nivel &&
      !["iniciante", "intermediario", "avancado"].includes(d.nivel)
    )
      throw new ApiError("Nível inválido.");
    if (
      d.prazo &&
      (typeof d.prazo !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(d.prazo) ||
        !Number.isFinite(Date.parse(d.prazo)))
    )
      throw new ApiError("Prazo inválido.");
    const tema = text(d.tema, "Tema");
    const perfil = {
      nivel: text(d.nivel, "Nível", 40, true),
      objetivo: text(d.objetivo, "Objetivo", 1000, true),
      idioma: text(d.idioma, "Idioma", 80, true),
      horasSemana: Number(d.horasSemana) || 7,
      prazo: text(d.prazo, "Prazo", 20, true),
    };
    await consumirCota(db, "ia");
    const value = await gerarRoteiro(tema, perfil);
    return NextResponse.json(value);
  } catch (error) {
    return failure(error);
  }
}
