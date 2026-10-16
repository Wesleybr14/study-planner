import { NextRequest, NextResponse } from "next/server";
import { gerarQuiz } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { titulo, descricao } = await req.json();
    if (!titulo) {
      return NextResponse.json({ erro: "Informe o título do tópico" }, { status: 400 });
    }
    const perguntas = await gerarQuiz(titulo, descricao ?? "");
    return NextResponse.json({ perguntas });
  } catch (err: any) {
    return NextResponse.json({ erro: err.message ?? "Erro ao gerar quiz" }, { status: 500 });
  }
}
