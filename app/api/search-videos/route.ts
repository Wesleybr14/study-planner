import { NextRequest, NextResponse } from "next/server";
import { buscarVideos } from "@/lib/youtube";
import { authorize, consumirCota, text, failure } from "@/lib/api-server";
export async function GET(req: NextRequest) {
  try {
    const db = await authorize(req);
    const q = text(req.nextUrl.searchParams.get("q"), "Busca", 500);
    await consumirCota(db, "video");
    return NextResponse.json(await buscarVideos(q));
  } catch (error) {
    return failure(error);
  }
}
