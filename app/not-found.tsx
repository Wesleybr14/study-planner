import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Página não encontrada.</h1>
      <p className="text-slate-500">
        O endereço pode ter mudado ou não existe.
      </p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Voltar ao painel
      </Link>
    </main>
  );
}
