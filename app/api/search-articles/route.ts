import { NextRequest, NextResponse } from "next/server";
import { buscarArtigos } from "@/lib/artigos";
import { authorize, text, failure } from "@/lib/api-server";
export async function GET(req: NextRequest) {
  try {
    await authorize(req);
    const q = text(req.nextUrl.searchParams.get("q"), "Busca", 500);
    return NextResponse.json(await buscarArtigos(q));
  } catch (error) {
    return failure(error);
  }
}
