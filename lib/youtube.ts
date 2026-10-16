const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY;

export async function buscarVideos(consulta: string, max = 3) {
  if (!YOUTUBE_KEY) return [];

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", consulta);
  url.searchParams.set("type", "video");
  url.searchParams.set("maxResults", String(max));
  url.searchParams.set("key", YOUTUBE_KEY);

  const res = await fetch(url);
  if (!res.ok) return [];

  const data = await res.json();
  return (data.items ?? []).map((item: any) => ({
    titulo: item.snippet.title,
    canal: item.snippet.channelTitle,
    thumbnail: item.snippet.thumbnails?.medium?.url,
    url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
    videoId: item.id.videoId,
  }));
}
