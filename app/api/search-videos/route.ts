import { NextRequest, NextResponse } from "next/server";
import { buscarVideos } from "@/lib/youtube";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  if (!q) return NextResponse.json([]);

  const videos = await buscarVideos(q);
  return NextResponse.json(videos);
}
