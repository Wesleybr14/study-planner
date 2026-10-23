import { NextRequest, NextResponse } from "next/server";
import { buscarLivros } from "@/lib/books";
import { authorize, text, failure } from "@/lib/api-server";
export async function GET(req: NextRequest) {
  try {
    await authorize(req);
    const q = text(req.nextUrl.searchParams.get("q"), "Busca", 500);
    return NextResponse.json(
      await buscarLivros(q, 4, req.nextUrl.searchParams.get("gratis") === "1"),
    );
  } catch (error) {
    return failure(error);
  }
}
