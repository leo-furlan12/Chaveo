
"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Button from "../components/Button";

export default function ConviteContrato() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [aceitando, setAceitando] = useState(false);
const [conviteAceito, setConviteAceito] = useState(false);

  const tokenConvite = searchParams.get("token");

  const [contrato, setContrato] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    async function buscarConvite() {
      if (!tokenConvite) {
        setMensagem("Link de convite inválido.");
        setCarregando(false);
        return;
      }

      const token = sessionStorage.getItem("token");

      if (!token) {
        router.replace(
          `/login?redirect=${encodeURIComponent(
            `/ConviteContrato?token=${tokenConvite}`
          )}`
        );
        return;
      }

      try {
        const resposta = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/contratos/convite/${tokenConvite}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
          setMensagem(dados.message || "Erro ao consultar convite.");
          return;
        }

        setContrato(dados);
      } catch {
        setMensagem("Não foi possível conectar ao servidor.");
      } finally {
        setCarregando(false);
      }
    }

    buscarConvite();
  }, [tokenConvite, router]);

  if (carregando) {
    return <p className="p-8">Carregando convite...</p>;
  }
async function aceitarConvite() {
  if (!tokenConvite || aceitando || conviteAceito) return;

  setAceitando(true);
  setMensagem("");

  try {
    const token = sessionStorage.getItem("token");

    if (!token) {
      setMensagem("Você precisa fazer login novamente.");
      return;
    }

    const resposta = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/contratos/convite/${tokenConvite}/aceitar`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      setMensagem(dados.message || "Erro ao aceitar convite.");
      return;
    }

    setConviteAceito(true);
    setMensagem("Convite aceito com sucesso!");
    router.push(`/CompletarContrato?id=${dados.contrato_id}`);
  } catch {
    setMensagem("Não foi possível conectar ao servidor.");
  } finally {
    setAceitando(false);
  }
}
  return (
    <main className="min-h-screen bg-linear-to-b from-ink from-60% to-ink-soft flex justify-center items-center p-6">
      <div className="bg-paper text-slate-darker rounded-xl p-7 w-full max-w-lg">
        <h1 className="font-display text-2xl font-bold text-center">
          Convite para contrato
        </h1>

       {mensagem && (
  <p
    role="status"
    className={`text-center mt-4 ${
      conviteAceito ? "text-teal" : "text-red-500"
    }`}
  >
    {mensagem}
  </p>
)}

        {contrato && (
          <div className="mt-6">
            <p className="mb-4">
              Você foi convidado para participar de um contrato de locação.
              Confira as informações:
            </p>

            <p><strong>Imóvel:</strong> {contrato.imovel.logradouro}, {contrato.imovel.numero}</p>
            <p><strong>Cidade:</strong> {contrato.imovel.cidade} - {contrato.imovel.estado}</p>
            <p><strong>Aluguel:</strong> R$ {Number(contrato.valor_aluguel).toFixed(2)}</p>
            <p><strong>Início:</strong> {contrato.data_inicio}</p>
            <p><strong>Término:</strong> {contrato.data_fim}</p>
            <p><strong>Vencimento:</strong> Dia {contrato.dia_vencimento}</p>
            <p><strong>Garantia:</strong> {contrato.garantia}</p>

            <div className="mt-6">
             {!conviteAceito && (
  <Button
    texto={aceitando ? "Aceitando..." : "Aceitar convite"}
    onClick={aceitarConvite}
    disabled={aceitando}
  />
)}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
