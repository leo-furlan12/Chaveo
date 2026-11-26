"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Button from "../components/Button";

const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
).replace(/\/$/, "");

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

      try {
        if (!token) {
          const conviteCodificado = encodeURIComponent(tokenConvite);
          const caminhoConvite = `/ConviteContrato?token=${conviteCodificado}`;

          const respostaDestino = await fetch(
            `${apiUrl}/contratos/convite/${conviteCodificado}/destino`,
            { cache: "no-store" }
          );

          const dadosDestino = await respostaDestino.json().catch(() => ({}));

          if (!respostaDestino.ok) {
            throw new Error(dadosDestino.message || "Convite indisponível.");
          }

          if (dadosDestino.destino === "CADASTRO") {
            router.replace(`/cadastro?convite=${conviteCodificado}`);
            return;
          }

          if (dadosDestino.destino === "LOGIN") {
            router.replace(`/login?redirect=${encodeURIComponent(caminhoConvite)}`);
            return;
          }

          throw new Error("Não foi possível identificar o destino do convite.");
        }

        const resposta = await fetch(
          `${apiUrl}/contratos/convite/${encodeURIComponent(tokenConvite)}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
          setMensagem(dados.message || "Erro ao consultar convite.");
          return;
        }

        setContrato(dados);
      } catch (erro) {
        setMensagem(erro.message || "Não foi possível conectar ao servidor.");
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
        `${apiUrl}/contratos/convite/${encodeURIComponent(tokenConvite)}/aceitar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        setMensagem(dados.message || "Erro ao aceitar convite.");
        return;
      }

      setConviteAceito(true);
      setMensagem("Convite aceito com sucesso!");
      //router.push(`/CompletarContrato?id=${dados.contrato_id}`);
      const destino = `/CompletarContrato?id=${encodeURIComponent(dados.contrato_id)}`;

      if (dados.perfil_adicionado) {
        sessionStorage.removeItem("token");
        router.replace(`/login?origem=convite&redirect=${encodeURIComponent(destino)}`);
        return;
      }

      router.push(destino);
    } catch {
      setMensagem("Não foi possível conectar ao servidor.");
    } finally {
      setAceitando(false);
    }
  }

  const NOMES_DESPESAS = {
  agua: "Água",
  luz: "Luz",
  internet: "Internet",
  gas: "Gás",
  condominio: "Condomínio",
  iptu: "IPTU",
};

const NOMES_GARANTIA = {
  fiador: "Fiador",
  seguro: "Seguro-fiança",
  caucao: "Caução",
  nenhuma: "Sem garantia",
};

const NOMES_TIPO_CAUCAO = {
  "3": "3 aluguéis",
  "2": "2 aluguéis",
  negociado: "Valor negociado",
};
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

            <p>
              <strong>Imóvel:</strong>{" "}
              {contrato.imovel?.logradouro || "Não informado"},{" "}
              {contrato.imovel?.numero || "S/N"}
            </p>
            <p>
              <strong>Cidade:</strong>{" "}
              {contrato.imovel?.cidade || "Não informada"} -{" "}
              {contrato.imovel?.estado || "--"}
            </p>
            <p>
              <strong>Aluguel:</strong> R${" "}
              {Number(contrato.valor_aluguel).toFixed(2)}
            </p>
            <p>
              <strong>Início:</strong> {contrato.data_inicio}
            </p>
            <p>
              <strong>Término:</strong> {contrato.data_fim}
            </p>
            <p>
              <strong>Vencimento:</strong> Dia {contrato.dia_vencimento}
            </p>
            <p>
              <strong>Garantia:</strong> {NOMES_GARANTIA[contrato.garantia] || contrato.garantia}
            </p>

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
