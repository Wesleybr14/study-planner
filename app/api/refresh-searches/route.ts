import { NextRequest, NextResponse } from "next/server";
import { gerarBuscas } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { titulos } = await req.json();
    if (!Array.isArray(titulos) || titulos.length === 0) {
      return NextResponse.json({ erro: "Nenhum tópico informado" }, { status: 400 });
    }
    const buscas = await gerarBuscas(titulos);
    return NextResponse.json({ buscas });
  } catch (err: any) {
    return NextResponse.json({ erro: err.message ?? "Erro ao atualizar buscas" }, { status: 500 });
  }
}
