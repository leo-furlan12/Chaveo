"use client"; //NEXT.JS

import Logo from "../components/Logo";
import Checkbox from "../components/Checkbox";
import Button from "../components/Button";
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

      let payloadToken = {};
      try {
        if (tokenRecebido) {
          payloadToken = JSON.parse(atob(tokenRecebido.split(".")[1]));
        }
      } catch {}

      const origemPerfis =
        dados?.perfis || dados?.usuario?.perfis || payloadToken?.perfis || [];

      const perfis = Array.isArray(origemPerfis)
        ? origemPerfis.map((p) => String(p).toUpperCase())
        : [String(origemPerfis).toUpperCase()];

      if (redirect && redirect.startsWith("/")) {
        router.replace(redirect);
      } else if (perfis.includes("INQUILINO")) {
        router.replace("/dashboardInquilino");
      } else if (perfis.includes("PROPRIETARIO")) {
        router.replace("/dashboard");
      } else {
        router.replace("/dashboardteste");
      }
    } catch {
      setErro(true);
      setMensagem("Não foi possível conectar ao servidor.");
    } finally {
      setCarregando(false);
    }
  }

  function formatarCPF(valor) {
    const digitos = String(valor || "")
      .replace(/\D/g, "")
      .slice(0, 11);
    return digitos
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d)/, "$1.$2")
      .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  }
  return (
    <main className="min-h-screen bg-linear-to-b from-ink from-60% to-ink-soft text-paper flex flex-col">
      <header>
        <div className="p-8">
          <Logo />
        </div>
      </header>

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
                value={formatarCPF(cpf)}
                onChange={(event) =>
                  setCpf(event.target.value.replace(/\D/g, "").slice(0, 11))
                }
                type="text"
                maxLength={14}
                className="bg-slate/10 p-3 rounded-lg w-full h-10"
                placeholder="000.000.000-00"
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
