import { NextRequest, NextResponse } from "next/server";
import { gerarQuiz } from "@/lib/gemini";
import { authorize, consumirCota, body, text, failure } from "@/lib/api-server";
export async function POST(req: NextRequest) {
  try {
    const db = await authorize(req);
    const d = await body(req);
    const titulo = text(d.titulo, "Título");
    const descricao = text(d.descricao, "Descrição", 4000, true);
    await consumirCota(db, "ia");
    const value = await gerarQuiz(titulo, descricao);
    return NextResponse.json({ perguntas: value });
  } catch (error) {
    return failure(error);
  }
}
