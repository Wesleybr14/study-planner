import { colide, type Bloco, type Layout } from "./layout";
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
/** Colisões deslocam os outros blocos para baixo, sem apagar ou ocultar conteúdo. */
export function acomodarBloco(layout: Layout, alvo: Bloco): Layout {
  const w = clamp(Math.round(alvo.w), 3, 12);
  const primeiro = {
    ...alvo,
    w,
    h: clamp(Math.round(alvo.h), 4, 40),
    x: clamp(Math.round(alvo.x), 0, 12 - w),
    y: clamp(Math.round(alvo.y), 0, 1000),
  };
  const colocados: Bloco[] = primeiro.oculto ? [] : [primeiro];
  const mapa = new Map([[primeiro.id, primeiro]]);
  for (const original of layout
    .filter((b) => b.id !== alvo.id)
    .sort((a, b) => a.y - b.y || a.x - b.x)) {
    let b = { ...original };
    if (!b.oculto) {
      const largura = clamp(b.w, 3, 12);
      b = {
        ...b,
        w: largura,
        x: clamp(b.x, 0, 12 - largura),
        h: clamp(b.h, 4, 40),
      };
      let conflitos = colocados.filter((c) => colide(c, b));
      while (conflitos.length) {
        b.y = Math.max(...conflitos.map((c) => c.y + c.h));
        conflitos = colocados.filter((c) => colide(c, b));
      }
      colocados.push(b);
    }
    mapa.set(b.id, b);
  }
  return layout.map((b) => mapa.get(b.id) ?? b);
}
export function organizarWorkspace(layout: Layout): Layout {
  const visiveis = layout.filter((b) => !b.oculto);
  let y = 0;
  const mapa = new Map<string, Bloco>();
  for (let i = 0; i < visiveis.length; i += 2) {
    const par = visiveis.slice(i, i + 2);
    const h = par.some((b) => b.id === "notas") ? 7 : 6;
    par.forEach((b, k) =>
      mapa.set(b.id, { ...b, x: k * 6, y, w: par.length === 1 ? 12 : 6, h }),
    );
    y += h;
  }
  return layout.map((b) => mapa.get(b.id) ?? b);
}
