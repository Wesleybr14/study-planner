// fetch para APIs externas (YouTube, Open Library, arXiv...): sempre com
// timeout, para uma fonte lenta não prender a rota, e com cache de 1 dia no
// Data Cache do Next — a mesma busca não gasta cota do provedor de novo.
const TIMEOUT_MS = 8000;
const CACHE_S = 86400;

export function buscarExterno(url: string | URL, init: RequestInit = {}) {
  return fetch(url, {
    ...init,
    signal: AbortSignal.timeout(TIMEOUT_MS),
    next: { revalidate: CACHE_S },
  });
}
