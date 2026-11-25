"use client"; //NEXT.JS

import Logo from "../components/Logo";
import Checkbox from "../components/Checkbox";
import Button from "../components/Button";
import { lerPerfisDoToken, listarAreas } from "../components/TrocarPerfil";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function ConteudoLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect");

  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [areas, setAreas] = useState([]);
  const destinoSolicitado = redirect && /^\/(?![\/\\])/.test(redirect) && !/[\\\x00-\x20]/.test(redirect)
    ? redirect
    : null;

  async function handleSubmit(event) {
    event.preventDefault();
    setMensagem("");
    setErro(false);
    setCarregando(true);

   
    try {
      const resposta = await fetch("http://localhost:4000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          cpf: cpf.replace(/\D/g, ""),
          senha: senha,
        }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(true);
        setMensagem(dados.message || "Erro ao realizar login");
        return;
      }

      const tokenRecebido = dados?.access_token || dados?.token;
      sessionStorage.setItem("token", tokenRecebido);
      setMensagem("Login realizado com sucesso!");

      const areasDisponiveis = listarAreas(
        dados.perfis ?? dados.usuario?.perfis ?? lerPerfisDoToken(tokenRecebido),
      );

      const veioDoConvite = destinoSolicitado?.startsWith("/ConviteContrato?");
      const acabouDeAceitarConvite = searchParams.get("origem") === "convite" &&
        destinoSolicitado?.startsWith("/CompletarContrato?");

      if (veioDoConvite || acabouDeAceitarConvite) {
        router.replace(destinoSolicitado);
        return;
      }

      if (areasDisponiveis.length > 1) {
        setAreas(areasDisponiveis);
        return;
      }

      router.replace(destinoSolicitado || areasDisponiveis[0]?.href || "/dashboardteste");
    } catch {
      setErro(true);
      setMensagem("Não foi possível conectar ao servidor.");
    } finally {
      setCarregando(false);
    }
  }

  if (areas.length > 1) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink p-4 text-paper">
        <section aria-labelledby="escolher-perfil" className="w-full max-w-md rounded-2xl border border-teal/30 bg-ink-soft p-6 sm:p-8">
          <h1 id="escolher-perfil" tabIndex={-1} ref={(titulo) => titulo?.focus()} className="text-2xl font-semibold">
            Com qual perfil você quer entrar?
          </h1>
          <div className="mt-6 grid gap-3">
            {areas.map(({ perfil, nome, href }) => (
              <button
                key={perfil}
                type="button"
                onClick={() => router.replace(href)}
                className="rounded-lg border border-teal/40 bg-teal/10 px-4 py-3 text-left font-semibold hover:bg-teal/20"
              >
                {nome}
              </button>
            ))}
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-linear-to-b from-ink from-60% to-ink-soft text-paper flex flex-col">
      <Link
        href="/"
        className="absolute left-6 top-6 inline-flex items-center gap-2 text-teal hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal"
      >
        <span aria-hidden="true">←</span> Voltar
      </Link>

      <section className="flex-1 flex content-center justify-center">
        <div>
          <div className="text-center">
            <div className="p-8 flex justify-center">
              <div className="p-8 flex justify-center">
                <Logo tamanho="!w-20 !h-20" />
              </div>
            </div>

            <h1 className="font-display text-4xl">Login</h1>
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid grid-cols-2 gap-4 font-[family-name:var(--font-jetbrains-mono)]"
          >
            <div>CPF:</div>
            <div className="col-span-2 row-start-2">
              <input
                value={cpf}
                onChange={(event) => setCpf(event.target.value)}
                type="text"
                className="bg-slate/10 p-3 rounded-lg w-full h-10"
                placeholder="Insira seu CPF"
              />
            </div>

            <div className="col-span-2 row-start-3">Senha:</div>
            <div className="col-span-2 row-start-4">
              <input
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                className="bg-slate/10 rounded-lg w-full p-3 h-10"
                type="password"
                placeholder="Insira sua senha"
              />
            </div>

            <div className="row-start-5 text-teal">
              <Checkbox texto="Lembrar Dados?" />
            </div>

            <div className="row-start-5 text-teal content-center text-right">
              Esqueci Senha
            </div>

            <div className="col-span-2 text-center">
              <Button
                type="submit"
                texto={carregando ? "Entrando..." : "Entrar"}
                disabled={carregando}
              />
              {mensagem && (
                <p
                  role={erro ? "alert" : "status"}
                  className={`col-span-2 text-center text-sm mt-2 ${
                    erro ? "text-red-400" : "text-teal"
                  }`}
                >
                  {mensagem}
                </p>
              )}
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}

export default function Login() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink" />}>
      <ConteudoLogin />
    </Suspense>
  );
}
