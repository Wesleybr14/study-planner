"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState<"login" | "cadastro">("login");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setAviso("");
    setCarregando(true);

    const { data, error } =
      modo === "login"
        ? await supabase.auth.signInWithPassword({ email, password: senha })
        : await supabase.auth.signUp({ email, password: senha });

    setCarregando(false);

    if (error) {
      setErro(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message);
      return;
    }

    // Cadastro com confirmação de e-mail ligada: ainda não existe sessão.
    if (modo === "cadastro" && !data.session) {
      setAviso(
        "Conta criada! Confirme seu e-mail para entrar. (Para pular isso, desative 'Confirm email' em Supabase > Authentication > Providers > Email.)"
      );
      return;
    }

    router.push("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-lg dark:border dark:border-slate-800 dark:bg-slate-900">
        <h1 className="mb-1 text-2xl font-bold">📚 Study Planner</h1>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          {modo === "login" ? "Entre na sua conta" : "Crie sua conta grátis"}
        </p>

        <form onSubmit={enviar} className="space-y-4">
          <input
            type="email"
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <input
            type="password"
            placeholder="Senha (mínimo 6 caracteres)"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
          />

          {erro && <p className="text-sm text-red-500">{erro}</p>}
          {aviso && <p className="text-sm text-green-600">{aviso}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-lg bg-blue-600 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {carregando ? "Aguarde..." : modo === "login" ? "Entrar" : "Cadastrar"}
          </button>
        </form>

        <button
          onClick={() => setModo(modo === "login" ? "cadastro" : "login")}
          className="mt-4 w-full text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          {modo === "login" ? "Não tem conta? Cadastre-se" : "Já tem conta? Entrar"}
        </button>
      </div>
    </main>
  );
}
