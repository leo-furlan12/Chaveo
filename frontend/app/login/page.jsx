"use client"; //NEXT.JS


import Logo from "../components/Logo"
import Checkbox from "../components/Checkbox";
import Button from "./Button";
import { useState } from "react";

//funções login/conexão com backend :

export default function Login() {
   const [cpf, setCpf] = useState("");
  //setCpf = função usada para alterar o cpf, eu quero morrer
  //cpf = valor atual
  const [senha, setSenha] = useState("");
/*//funcao para enviar login
  function handleSubmit(event) {
  event.preventDefault(); //nao recarregar a pagina

  console.log("CPF:", cpf);
  console.log("Senha:", senha); */
  async function handleSubmit(event) {
  event.preventDefault();

  try {
    const resposta = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/auth/login`, //await = esperar respostas 
      {
        method: "POST", //metodo de envio de dados a backend por HTTP
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ //javaScript que transforma cpf e senha em arquivo json
          cpf: cpf,
          senha: senha,
        }),
      }
    );

    const dados = await resposta.json();//pega resultados da função await resposta 

    if (!resposta.ok) {//compara resultado de "resposta"(200 - correto 401-erro)
      console.log("Erro no login:", dados.message);// mostra erro referente
      return;
    }

    console.log("Login realizado com sucesso!");
    console.log("Token recebido?", Boolean(dados.access_token));

  } catch (erro) {
    console.error("Erro ao conectar com o backend:", erro);
  }
}





  return (
    <main className="min-h-screen  bg-linear-to-b  from-ink from-60% to-ink-soft text-paper flex flex-col">
      <header>
        <div>
          <div className="p-8 ">
            <Logo />
          </div>
        </div>
      </header>

      <section className="flex-1 flex content-center justify-center ">
        <div className="">
          <div className="text-center">
            <div className="p-8 flex justify-center">
              <div className="p-8 flex justify-center">
                <Logo tamanho="!w-20 !h-20" />
              </div>
            </div>

            <h1 className="font-display text-4xl">Login</h1>
          </div>

          <form  onSubmit={handleSubmit} className="grid grid-cols-2  gap-4 font-[family-name:var(--font-jetbrains-mono)]">
            <div>CPF:</div>
            <div className="col-span-2 row-start-2">
              {" "}
              <input
                value={cpf}
                onChange={(event) => setCpf(event.target.value)}
                type="text"
                className="bg-slate/10 p-3 rounded-lg w-full h-10"
                placeholder="Insira seu CPF"
              />
            </div>

            <div className="col-span-2 row-start-3 ">Senha:</div>
            <div className="col-span-2 row-start-4">
              {" "}
              <input
                value={senha}
                onChange={(event) => setSenha(event.target.value)}
                className="bg-slate/10 rounded-lg w-full p-3 h-10 "
                type="password"
                placeholder="Insira sua senha"
              />
            </div>
            <div className="row-start-5 text-teal ">
              <Checkbox texto="Lembrar Dados?"></Checkbox>
            </div>
            <div
              className="row-start-5 text-teal  content-center text-right
">
              {" "}
              Esqueci Senha
            </div>
            <div className="col-span-2 text-center">
              <Button texto="Entrar"></Button>
            </div>
          </form>
        </div>
      </section>
    </main>
  );
}
