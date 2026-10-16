import { NextRequest, NextResponse } from "next/server";
import { buscarArtigos } from "@/lib/artigos";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q) return NextResponse.json([]);

  try {
    const artigos = await buscarArtigos(q);
    return NextResponse.json(artigos);
  } catch {
    return NextResponse.json([]);
  }
}
