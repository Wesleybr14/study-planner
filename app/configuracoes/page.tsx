"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { criarBackup, restaurarBackup } from "@/lib/backup";
import { caminhosDeRoteiros, removerDoBucket } from "@/lib/arquivos";
import AppShell from "@/components/AppShell";

export default function Configuracoes() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [carregando, setCarregando] = useState(true);
  const [msg, setMsg] = useState("");
  const [erro, setErro] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [apagarAntes, setApagarAntes] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else setCarregando(false);
    });
  }, [router]);

  function aviso(texto: string) {
    setErro("");
    setMsg(texto);
    setTimeout(() => setMsg(""), 4000);
  }

  async function exportar() {
    setOcupado(true);
    setErro("");
    try {
      const backup = await criarBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const data = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `study-planner-backup-${data}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      aviso(
        `Backup exportado com ${backup.roteiros.length} ${
          backup.roteiros.length === 1 ? "roteiro" : "roteiros"
        }.`,
      );
    } catch (e: any) {
      setErro(e.message ?? "Falha ao exportar.");
    } finally {
      setOcupado(false);
    }
  }

  async function importar(arquivo: File) {
    setOcupado(true);
    setErro("");
    try {
      if (arquivo.size > 300 * 1024 * 1024)
        throw new Error(
          "Backup maior que 300 MB. Divida seus arquivos antes de importar.",
        );
      const dados: unknown = JSON.parse(await arquivo.text());
      if (
        apagarAntes &&
        !window.confirm(
          "Substituir os dados atuais pelo backup? A validação e a restauração serão feitas antes de confirmar a troca.",
        )
      )
        return;
      const importados = await restaurarBackup(dados, apagarAntes);
      aviso(
        `Importados ${importados} ${importados === 1 ? "roteiro" : "roteiros"}.`,
      );
    } catch (e: any) {
      setErro(e.message ?? "Falha ao importar.");
    } finally {
      setOcupado(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function apagarTudo() {
    if (
      !window.confirm(
        "Apagar TODOS os roteiros? Essa ação não pode ser desfeita. Exporte um backup antes.",
      )
    )
      return;
    setOcupado(true);
    setErro("");
    try {
      const caminhos = await caminhosDeRoteiros();
      const { error } = await supabase
        .from("roteiros")
        .delete()
        .not("id", "is", null);
      if (error) throw error;
      await removerDoBucket(caminhos);
      aviso("Todos os roteiros foram apagados.");
    } catch (e: any) {
      setErro(e.message ?? "Falha ao apagar.");
    } finally {
      setOcupado(false);
    }
  }

  const card =
    "rounded-xl bg-white p-5 shadow dark:border dark:border-slate-800 dark:bg-slate-900";
  const botao =
    "rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50";

  return (
    <AppShell largura="foco">
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Backup, restauração e gerenciamento dos seus dados.
        </p>
      </header>

      {carregando ? (
        <p className="text-slate-500 dark:text-slate-400">Carregando...</p>
      ) : (
        <div className="space-y-4">
          {msg && (
            <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
              ✅ {msg}
            </p>
          )}
          {erro && (
            <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
              ⚠️ {erro}
            </p>
          )}

          <section className={card}>
            <h2 className="mb-1 font-semibold">⬇️ Exportar backup</h2>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
              Baixa um arquivo <code>.json</code> com todos os seus roteiros,
              tópicos, anotações, flashcards, quizzes, sessões, tags, arranjos e
              arquivos PDF/EPUB deste navegador e da nuvem. O download pode
              demorar conforme o tamanho dos arquivos.
            </p>
            <button onClick={exportar} disabled={ocupado} className={botao}>
              Exportar backup (.json)
            </button>
          </section>

          <section className={card}>
            <h2 className="mb-1 font-semibold">⬆️ Importar backup</h2>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
              Restaura os dados a partir de um arquivo exportado anteriormente.
              Os itens são adicionados à sua conta. Backups antigos (v1) não
              contêm sessões nem arquivos.
            </p>
            <label className="mb-3 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
              <input
                type="checkbox"
                checked={apagarAntes}
                onChange={(e) => setApagarAntes(e.target.checked)}
                className="h-4 w-4"
              />
              Apagar os roteiros atuais antes de importar
            </label>
            <input
              ref={inputRef}
              type="file"
              accept="application/json,.json"
              disabled={ocupado}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importar(f);
              }}
              className="block w-full cursor-pointer rounded-lg border border-slate-300 p-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:px-3 file:py-1 file:text-blue-700 dark:border-slate-700 dark:file:bg-slate-800 dark:file:text-blue-300"
            />
          </section>

          <section
            className={`${card} border border-red-200 dark:border-red-900/60`}
          >
            <h2 className="mb-1 font-semibold text-red-600 dark:text-red-400">
              🧹 Zona de risco
            </h2>
            <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
              Apaga permanentemente todos os roteiros da sua conta. Considere
              exportar um backup antes.
            </p>
            <button
              onClick={apagarTudo}
              disabled={ocupado}
              className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/30"
            >
              Apagar todos os roteiros
            </button>
          </section>
        </div>
      )}
    </AppShell>
  );
}
