"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Icon, { Brand } from "@/components/Icon";
import ThemeToggle from "@/components/ThemeToggle";

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState<
    "login" | "cadastro" | "esqueci" | "redefinir"
  >("login");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setModo("redefinir");
    });
    if (window.location.hash.includes("type=recovery")) setModo("redefinir");
    return () => data.subscription.unsubscribe();
  }, []);
  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setAviso("");
    setCarregando(true);
    try {
      if (modo === "esqueci") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/login`,
        });
        if (error) throw error;
        setAviso(
          "Se houver uma conta com este e-mail, você receberá um link para redefinir a senha.",
        );
        return;
      }
      if (modo === "redefinir") {
        const { error } = await supabase.auth.updateUser({ password: senha });
        if (error) throw error;
        setAviso("Senha atualizada.");
        router.push("/dashboard");
        return;
      }
      const { data, error } =
        modo === "login"
          ? await supabase.auth.signInWithPassword({ email, password: senha })
          : await supabase.auth.signUp({ email, password: senha });
      if (error) throw error;
      if (modo === "cadastro" && !data.session) {
        setAviso("Conta criada! Confirme seu e-mail para entrar.");
        return;
      }
      router.push("/dashboard");
    } catch (e) {
      setErro(
        e instanceof Error && e.message === "Invalid login credentials"
          ? "E-mail ou senha incorretos"
          : "Não foi possível concluir. Verifique seus dados e tente novamente.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="Sobre o Study Planner">
        <Brand />
        <div className="auth-story-copy">
          <span className="eyebrow">CURIOSIDADE É SÓ O COMEÇO</span>
          <h1>
            Grandes descobertas.
            <br />
            Pequenos passos<span>.</span>
          </h1>
          <p>
            Transforme o que você quer aprender em um caminho que faz sentido
            para você.
          </p>
        </div>
        <div className="learning-illustration" aria-hidden="true">
          <div className="illustration-orbit orbit-one" />
          <div className="illustration-orbit orbit-two" />
          <div className="illustration-label">
            <Icon name="spark" size={16} /> Uma ideia. Muitas possibilidades.
          </div>
          <div className="illustration-card">
            <div className="illustration-card-top">
              <span className="illustration-book">
                <Icon name="book" size={27} />
              </span>
              <span>
                SEU PRÓXIMO CAPÍTULO<small>Aprenda algo novo hoje</small>
              </span>
              <Icon name="arrow" />
            </div>
            <div className="illustration-rule" />
            <div className="illustration-step">
              <span className="step-check">
                <Icon name="check" size={13} />
              </span>
              Explore um novo assunto<span>01</span>
            </div>
            <div className="illustration-step">
              <span className="step-check">
                <Icon name="check" size={13} />
              </span>
              Encontre o seu ritmo<span>02</span>
            </div>
            <div className="illustration-step">
              <span className="step-open" />
              Continue descobrindo<span>03</span>
            </div>
            <div className="illustration-progress">
              <span />
            </div>
          </div>
          <span className="illustration-stamp">
            <Icon name="leaf" size={22} /> No seu tempo.
          </span>
        </div>
        <footer className="auth-story-footer">
          <span>Feito para mentes curiosas.</span>
          <Icon name="spark" size={17} />
        </footer>
      </section>
      <section className="auth-form-area">
        <div className="auth-theme">
          <ThemeToggle />
        </div>
        <div className="auth-form-card">
          <div className="auth-mobile-brand">
            <Brand />
          </div>
          <span className="eyebrow">
            {modo === "login"
              ? "BEM-VINDO DE VOLTA"
              : modo === "cadastro"
                ? "UM NOVO COMEÇO"
                : "VAMOS AJUDAR VOCÊ"}
          </span>
          <h2 className="auth-title">
            {modo === "login"
              ? "Bom ter você aqui."
              : modo === "cadastro"
                ? "Dê o primeiro passo."
                : modo === "esqueci"
                  ? "Recupere seu acesso."
                  : "Uma nova senha."}
          </h2>
          <p className="auth-description">
            {modo === "login"
              ? "Entre para continuar a sua jornada de aprendizado."
              : modo === "cadastro"
                ? "Crie sua conta e descubra o que vem a seguir."
                : modo === "esqueci"
                  ? "Recuperar acesso"
                  : "Defina sua nova senha"}
          </p>

          <form onSubmit={enviar} className="space-y-4">
            {modo !== "redefinir" && (
              <label className="block text-sm">
                E-mail
                <input
                  autoComplete="email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </label>
            )}
            {modo !== "esqueci" && (
              <label className="block text-sm">
                Senha
                <input
                  autoComplete={
                    modo === "login" ? "current-password" : "new-password"
                  }
                  type="password"
                  placeholder="Sua senha (mínimo de 6 caracteres)"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                />
              </label>
            )}

            {erro && (
              <p role="alert" className="text-sm text-red-500">
                {erro}
              </p>
            )}
            {aviso && (
              <p role="status" className="text-sm text-green-600">
                {aviso}
              </p>
            )}

            <button
              type="submit"
              disabled={carregando}
              className="primary-button auth-submit"
            >
              {carregando
                ? "Aguarde..."
                : modo === "login"
                  ? "Entrar na minha conta"
                  : modo === "cadastro"
                    ? "Cadastrar"
                    : modo === "esqueci"
                      ? "Enviar link"
                      : "Salvar senha"}
            </button>
          </form>

          {modo === "login" && (
            <button
              type="button"
              onClick={() => {
                setModo("esqueci");
                setErro("");
                setAviso("");
              }}
              className="auth-forgot"
            >
              Esqueci minha senha
            </button>
          )}
          <button
            onClick={() => setModo(modo === "login" ? "cadastro" : "login")}
            className="auth-switch"
          >
            {modo === "login"
              ? "Não tem conta? Cadastre-se"
              : "Já tem conta? Entrar"}
          </button>
          <p className="auth-footnote">
            <Icon name="leaf" size={14} /> Seu espaço para aprender, no seu
            ritmo.
          </p>
        </div>
      </section>
    </main>
  );
}
