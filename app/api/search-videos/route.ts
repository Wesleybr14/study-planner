import { NextRequest, NextResponse } from "next/server";
import { buscarVideos } from "@/lib/youtube";
import { authorize, text, failure } from "@/lib/api-server";
export async function GET(req: NextRequest) {
  try {
    await authorize(req);
    const q = text(req.nextUrl.searchParams.get("q"), "Busca", 500);
    return NextResponse.json(await buscarVideos(q));
  } catch (error) {
    return failure(error);
  }
}
