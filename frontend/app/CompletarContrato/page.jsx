
"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function CompletarContrato() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contratoId = searchParams.get("id");

  const [contrato, setContrato] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [carregando, setCarregando] = useState(true);

  const [fiadorNome, setFiadorNome] = useState("");
const [fiadorCpf, setFiadorCpf] = useState("");
const [fiadorQualificacao, setFiadorQualificacao] = useState("");
const [fiadorImovel, setFiadorImovel] = useState("");
const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    async function buscarContrato() {
      if (!contratoId) {
        setMensagem("Contrato não informado.");
        setCarregando(false);
        return;
      }

      const token = sessionStorage.getItem("token");

      if (!token) {
        const destino = `/CompletarContrato?id=${contratoId}`;

        router.replace(
          `/login?redirect=${encodeURIComponent(destino)}`
        );
        return;
      }

      try {
        const resposta = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/contratos/${contratoId}/dados`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
          setMensagem(dados.message || "Erro ao buscar contrato.");
          return;
        }

        setContrato(dados);
      } catch {
        setMensagem("Não foi possível conectar ao servidor.");
      } finally {
        setCarregando(false);
      }
    }

    buscarContrato();
  }, [contratoId, router]);

  async function salvarFiador() {
  if (salvando) return;

  setSalvando(true);
  setMensagem("");

  try {
    const token = sessionStorage.getItem("token");

    if (!token) {
      setMensagem("Você precisa fazer login novamente.");
      return;
    }

    const resposta = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/contratos/${contratoId}/fiador`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fiador_nome: fiadorNome,
          fiador_cpf: fiadorCpf.replace(/\D/g, ""),
          fiador_qualificacao: fiadorQualificacao,
          fiador_imovel: fiadorImovel,
        }),
      }
    );
    

    const dados = await resposta.json();

    if (!resposta.ok) {
      setMensagem(
        Array.isArray(dados.message)
          ? dados.message.join(", ")
          : dados.message || "Erro ao salvar os dados do fiador."
      );
      return;
    }

    setMensagem("Dados do fiador salvos com sucesso!");
  } catch {
    setMensagem("Não foi possível conectar ao servidor.");
  } finally {
    setSalvando(false);
  }
}

async function concluirPreenchimento() {
  if (salvando) return;

  const confirmar = window.confirm(
    "Você confirma que terminou de preencher os dados do contrato?"
  );

  if (!confirmar) return;

  setSalvando(true);
  setMensagem("");

  try {
    const token = sessionStorage.getItem("token");

    if (!token) {
      setMensagem("Você precisa fazer login novamente.");
      return;
    }

    const resposta = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/contratos/${contratoId}/concluir-dados`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      setMensagem(
        Array.isArray(dados.message)
          ? dados.message.join(", ")
          : dados.message || "Erro ao concluir o preenchimento."
      );
      return;
    }

    setContrato((anterior) => ({
      ...anterior,
      status: dados.status,
    }));

    setMensagem(
      "Preenchimento concluído! O contrato está aguardando revisão do proprietário."
    );
  } catch {
    setMensagem("Não foi possível conectar ao servidor.");
  } finally {
    setSalvando(false);
  }
}

  return (
    <main className="min-h-screen bg-linear-to-b from-ink from-60% to-ink-soft flex justify-center items-center p-6">
      <div className="bg-paper text-slate-darker rounded-xl p-7 w-full max-w-lg">
        <h1 className="font-display text-2xl font-bold text-center">
          Completar contrato
        </h1>

        {carregando && (
          <p className="text-center mt-4">Carregando contrato...</p>
        )}

        {mensagem && (
          <p role="alert" className="text-red-500 text-center mt-4">
            {mensagem}
          </p>
        )}

        {contrato && (
          <div className="mt-6 space-y-4">
            <p>
              <strong>Contrato:</strong> nº {contrato.id}
            </p>

            <p>
              <strong>Status:</strong> {contrato.status}
            </p>

            {contrato.status !== "PENDENTE_DADOS" ? (
              <p>Este contrato não está aguardando preenchimento.</p>
            ) : (
              <>
                
{contrato.garantia === "fiador" && (
  <div className="space-y-4">
    <h2 className="font-bold text-lg">
      Dados do fiador
    </h2>

    <p>
      Informe os dados da pessoa que será fiadora
      deste contrato.
    </p>

    <div>
      <label className="block mb-1">Nome completo</label>
      <input
        type="text"
        value={fiadorNome}
        onChange={(e) => setFiadorNome(e.target.value)}
        className="w-full border rounded-lg p-2"
        placeholder="Nome do fiador"
      />
    </div>

    <div>
      <label className="block mb-1">CPF</label>
      <input
        type="text"
        value={fiadorCpf}
        onChange={(e) =>
          setFiadorCpf(e.target.value.replace(/\D/g, "").slice(0, 11))
        }
        className="w-full border rounded-lg p-2"
        placeholder="Somente números"
        maxLength={11}
      />
    </div>

    <div>
      <label className="block mb-1">Qualificação do fiador</label>
      <textarea
        value={fiadorQualificacao}
        onChange={(e) => setFiadorQualificacao(e.target.value)}
        className="w-full border rounded-lg p-2"
        rows={3}
        placeholder="Nacionalidade, estado civil, profissão, RG e endereço"
      />
    </div>

    <div>
      <label className="block mb-1">
        Informações do imóvel do fiador
      </label>
      <textarea
        value={fiadorImovel}
        onChange={(e) => setFiadorImovel(e.target.value)}
        className="w-full border rounded-lg p-2"
        rows={3}
        placeholder="Matrícula, cartório de registro e cidade/UF"
      />
    </div>

    <button
      type="button"
      onClick={salvarFiador}
      disabled={salvando}
      className="w-full bg-ink text-white rounded-lg p-3 disabled:opacity-50"
    >
      {salvando ? "Salvando..." : "Salvar dados do fiador"}
    </button>
  </div>
)}


                {contrato.garantia === "seguro" && (
                  <div>
                    <h2 className="font-bold text-lg">
                      Seguro-fiança
                    </h2>
                    <p>
                      O proprietário precisa informar a
                      seguradora e o número da apólice.
                    </p>
                  </div>
                )}

                {contrato.garantia === "caucao" && (
                  <div>
                    <h2 className="font-bold text-lg">
                      Caução
                    </h2>
                    <p>
                      Valor da caução: R${" "}
                      {Number(contrato.valor_caucao).toFixed(2)}
                    </p>
                  </div>
                )}

                {contrato.garantia === "nenhuma" && (
                  <div>
                    <h2 className="font-bold text-lg">
                      Sem garantia
                    </h2>
                    <p>
                      Não é necessário preencher dados
                      adicionais de garantia.
                    </p>
                  </div>
                )}
                <button
  type="button"
  onClick={concluirPreenchimento}
  disabled={salvando}
  className="w-full bg-ink text-white rounded-lg p-3 mt-6 disabled:opacity-50"
>
  {salvando ? "Aguarde..." : "Concluir preenchimento"}
</button>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
