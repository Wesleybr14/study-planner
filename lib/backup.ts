import { supabase } from "./supabase";
import {
  baixarNuvem,
  caminhosDeRoteiros,
  exportarLocais,
  mimeDe,
  removerDoBucket,
  restaurarLocal,
  removerLocal,
  type TipoArquivo,
} from "./arquivos";
import { identificarTopicos, progresso } from "./models";
import { normalizarArranjos } from "./layout";
type Registro = Record<string, any>;
export type ArquivoBackup = {
  origem: "local" | "nuvem";
  roteiro_id: string;
  topico_index: number;
  tipo: TipoArquivo;
  nome: string;
  mime: string;
  dados: string;
};
export type Backup = {
  versao: number;
  exportado_em: string;
  roteiros: Registro[];
  preferencias?: unknown;
  sessoes?: Registro[];
  arquivos?: ArquivoBackup[];
};
async function base64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}
function blobDe(a: ArquivoBackup) {
  const bytes = atob(a.dados);
  return new Blob([Uint8Array.from(bytes, (c) => c.charCodeAt(0))], {
    type: a.mime,
  });
}
export function validarBackup(value: unknown): Backup {
  const b = value as Backup;
  if (
    !b ||
    ![1, 2].includes(b.versao) ||
    !Array.isArray(b.roteiros) ||
    b.roteiros.length > 1000
  )
    throw new Error("Formato ou versão de backup inválidos.");
  const ids = new Set<string>();
  for (const r of b.roteiros) {
    if (
      !r ||
      typeof r.id !== "string" ||
      ids.has(r.id) ||
      typeof r.tema !== "string" ||
      !r.tema.trim() ||
      !Array.isArray(r.topicos) ||
      r.topicos.length > 1000 ||
      r.topicos.some((t: Registro) => !t || typeof t.titulo !== "string") ||
      (r.tags &&
        (!Array.isArray(r.tags) ||
          r.tags.some((t: unknown) => typeof t !== "string"))) ||
      (r.prazo && !/^\d{4}-\d{2}-\d{2}$/.test(r.prazo))
    )
      throw new Error("Roteiro inválido no backup.");
    ids.add(r.id);
  }
  if (b.sessoes !== undefined && !Array.isArray(b.sessoes))
    throw new Error("Sessões inválidas.");
  for (const s of b.sessoes ?? [])
    if (
      !s ||
      !Number.isFinite(s.segundos) ||
      s.segundos < 0 ||
      !Number.isFinite(Date.parse(s.criado_em)) ||
      (s.roteiro_id && !ids.has(s.roteiro_id))
    )
      throw new Error("Sessão inválida no backup.");
  if (b.arquivos !== undefined && !Array.isArray(b.arquivos))
    throw new Error("Arquivos inválidos.");
  for (const a of b.arquivos ?? []) {
    if (
      !a ||
      !ids.has(a.roteiro_id) ||
      !Number.isSafeInteger(a.topico_index) ||
      a.topico_index < 0 ||
      !["local", "nuvem"].includes(a.origem) ||
      !["livro", "artigo"].includes(a.tipo) ||
      typeof a.nome !== "string" ||
      typeof a.mime !== "string" ||
      typeof a.dados !== "string" ||
      a.dados.length > 70 * 1024 * 1024
    )
      throw new Error("Arquivo inválido no backup.");
    blobDe(a); // Valida os bytes antes de apagar qualquer dado.
  }
  return b;
}
export async function criarBackup(): Promise<Backup> {
  const [
    { data: roteiros, error: e1 },
    { data: sessoes, error: e2 },
    { data: arquivos, error: e3 },
    { data: pref, error: e4 },
  ] = await Promise.all([
    supabase.from("roteiros").select("*"),
    supabase.from("sessoes").select("*"),
    supabase.from("arquivos").select("*"),
    supabase.from("preferencias").select("layout").maybeSingle(),
  ]);
  for (const e of [e1, e2, e3, e4]) if (e) throw new Error(e.message);
  const binarios: ArquivoBackup[] = [];
  for (const a of arquivos ?? [])
    binarios.push({
      origem: "nuvem",
      roteiro_id: a.roteiro_id,
      topico_index: a.topico_index,
      tipo: a.tipo,
      nome: a.nome,
      mime: a.mime ?? "",
      dados: await base64(await baixarNuvem(a.storage_path)),
    });
  for (const a of await exportarLocais((roteiros ?? []).map((r) => r.id))) {
    const [roteiro_id, indice] = a.escopo.split(":");
    binarios.push({
      origem: "local",
      roteiro_id,
      topico_index: Number(indice),
      tipo: a.tipo,
      nome: a.nome,
      mime: a.mime,
      dados: await base64(a.blob),
    });
  }
  return {
    versao: 2,
    exportado_em: new Date().toISOString(),
    roteiros: roteiros ?? [],
    sessoes: sessoes ?? [],
    arquivos: binarios,
    preferencias: pref?.layout ?? null,
  };
}
export async function restaurarBackup(value: unknown, substituir: boolean) {
  const b = validarBackup(value);
  const { data: auth, error } = await supabase.auth.getUser();
  if (error || !auth.user) throw new Error("Sessão expirada.");
  const mapa = new Map(b.roteiros.map((r) => [r.id, crypto.randomUUID()]));
  const roteiros = b.roteiros.map((r) => {
    const topicos = identificarTopicos(r.topicos);
    return {
      ...r,
      id: mapa.get(r.id),
      topicos,
      progresso: progresso(topicos as { concluido?: boolean }[]),
    };
  });
  const sessoes = (b.sessoes ?? []).map((s) => ({
    ...s,
    id: crypto.randomUUID(),
    roteiro_id: s.roteiro_id ? mapa.get(s.roteiro_id) : null,
  }));
  const pref = b.preferencias ? normalizarArranjos(b.preferencias) : null;
  if (pref)
    for (const campo of ["trabalho", "escolha"] as const) {
      const remap: Record<string, any> = {};
      for (const [k, v] of Object.entries(pref[campo])) {
        const [id, indice] = k.split(":");
        if (mapa.has(id)) remap[`${mapa.get(id)}:${indice}`] = v;
      }
      pref[campo] = remap;
    }
  if (pref && !substituir) {
    const atual = await supabase
      .from("preferencias")
      .select("layout")
      .maybeSingle();
    if (atual.error) throw atual.error;
    if (atual.data?.layout) {
      const a = normalizarArranjos(atual.data.layout);
      pref.trabalho = { ...a.trabalho, ...pref.trabalho };
      pref.escolha = { ...a.escolha, ...pref.escolha };
      pref.salvos = [
        ...a.salvos,
        ...pref.salvos.filter((s) => !a.salvos.some((t) => t.id === s.id)),
      ];
    }
  }
  const enviados: string[] = [],
    locais: string[] = [],
    arquivos: Registro[] = [];
  let rpcIniciado = false,
    rollbackConfirmado = false;
  // Ao substituir, os arquivos antigos na nuvem perdem suas linhas na restauração.
  const antigos = substituir ? await caminhosDeRoteiros() : [];
  try {
    for (const a of b.arquivos ?? []) {
      const roteiro_id = mapa.get(a.roteiro_id)!;
      const blob = blobDe(a);
      if (a.origem === "local")
        locais.push(
          await restaurarLocal({
            escopo: `${roteiro_id}:${a.topico_index}:${a.tipo}`,
            tipo: a.tipo,
            nome: a.nome,
            mime: a.mime,
            blob,
          }),
        );
      else {
        const id = crypto.randomUUID();
        const path = `${auth.user.id}/${roteiro_id}/${id}`;
        const up = await supabase.storage.from("arquivos").upload(path, blob, {
          contentType: mimeDe(a.nome, a.mime) || undefined,
        });
        if (up.error) throw up.error;
        enviados.push(path);
        arquivos.push({
          id,
          roteiro_id,
          topico_index: a.topico_index,
          tipo: a.tipo,
          nome: a.nome,
          mime: a.mime,
          tamanho: blob.size,
          storage_path: path,
        });
      }
    }
    rpcIniciado = true;
    const result = await supabase.rpc("restaurar_backup", {
      payload: { roteiros, sessoes, arquivos, preferencias: pref },
      substituir,
    });
    if (result.error) {
      rollbackConfirmado =
        /^[0-9A-Z]{5}$/.test(result.error.code ?? "") &&
        !["PGRST000", "PGRST001", "PGRST002"].includes(result.error.code);
      throw new Error(
        result.error.message +
          " Verifique se a migração 7 foi aplicada. Em falhas de conexão, confira seus dados antes de repetir a importação.",
      );
    }
    await removerDoBucket(antigos);
    return roteiros.length;
  } catch (e) {
    if (!rpcIniciado || rollbackConfirmado) {
      if (enviados.length)
        await supabase.storage.from("arquivos").remove(enviados);
      await Promise.all(locais.map(removerLocal));
    }
    throw e;
  }
}
