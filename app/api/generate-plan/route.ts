import { NextRequest, NextResponse } from "next/server";
import { gerarRoteiro } from "@/lib/gemini";

export async function POST(req: NextRequest) {
  try {
    const { tema } = await req.json();
    if (!tema) {
      return NextResponse.json({ erro: "Informe um tema" }, { status: 400 });
    }
    const roteiro = await gerarRoteiro(tema);
    return NextResponse.json(roteiro);
  } catch (err: any) {
    return NextResponse.json({ erro: err.message ?? "Erro ao gerar roteiro" }, { status: 500 });
  }
}
