import { NextRequest, NextResponse } from "next/server";
import { gerarFlashcards } from "@/lib/gemini";
import { authorize, body, text, failure, ApiError } from "@/lib/api-server";
export async function POST(req: NextRequest) {
  try {
    await authorize(req, true);
    const d = await body(req);
    const value = await gerarFlashcards(
      text(d.titulo, "Título"),
      text(d.descricao, "Descrição", 4000, true),
    );
    return NextResponse.json({ flashcards: value });
  } catch (error) {
    return failure(error);
  }
}
