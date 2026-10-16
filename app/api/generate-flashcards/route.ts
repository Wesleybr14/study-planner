import { NextRequest, NextResponse } from "next/server";
import { gerarFlashcards } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { titulo, descricao } = await req.json();
    if (!titulo) {
      return NextResponse.json({ erro: "Informe o título do tópico" }, { status: 400 });
    }
    const flashcards = await gerarFlashcards(titulo, descricao ?? "");
    return NextResponse.json({ flashcards });
  } catch (err: any) {
    return NextResponse.json({ erro: err.message ?? "Erro ao gerar flashcards" }, { status: 500 });
  }
}
