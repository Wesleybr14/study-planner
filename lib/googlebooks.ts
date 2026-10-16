// A chave do YouTube (Google Cloud) também serve para a Books API,
// desde que a "Books API" esteja ativada no mesmo projeto.
const GOOGLE_KEY = process.env.GOOGLE_BOOKS_API_KEY ?? process.env.YOUTUBE_API_KEY;

type Livro = {
  titulo: string;
  autores: string;
  capa: string | null;
  url: string;
};

async function consultar(consulta: string, max: number, comChave: boolean): Promise<Livro[]> {
  const url = new URL("https://www.googleapis.com/books/v1/volumes");
  url.searchParams.set("q", consulta);
  url.searchParams.set("maxResults", String(max));
  if (comChave && GOOGLE_KEY) url.searchParams.set("key", GOOGLE_KEY);

  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`${res.status}`);

  const data = await res.json();
  return (data.items ?? []).map((item: any) => ({
    titulo: item.volumeInfo?.title ?? "Sem título",
    autores: item.volumeInfo?.authors?.join(", ") ?? "Desconhecido",
    capa: item.volumeInfo?.imageLinks?.thumbnail ?? null,
    url: item.volumeInfo?.infoLink ?? "#",
  }));
}

export async function buscarLivros(consulta: string, max = 3): Promise<Livro[]> {
  // Tenta com a chave (cota própria). Se a Books API não estiver ativada (403)
  // ou a cota esgotar (429), tenta sem chave. Se tudo falhar, retorna vazio.
  try {
    return await consultar(consulta, max, true);
  } catch {
    try {
      return await consultar(consulta, max, false);
    } catch {
      return [];
    }
  }
}
