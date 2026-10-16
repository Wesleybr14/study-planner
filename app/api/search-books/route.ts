import { NextRequest, NextResponse } from "next/server";
import { buscarLivros } from "@/lib/books";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q) return NextResponse.json([]);

  const apenasGratis = req.nextUrl.searchParams.get("gratis") === "1";
  const livros = await buscarLivros(q, 4, apenasGratis);
  return NextResponse.json(livros);
}
