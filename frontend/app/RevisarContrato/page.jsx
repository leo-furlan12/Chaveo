"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function RevisarContrato() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contratoId = searchParams.get("id");

  const [contrato, setContrato] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [aprovando, setAprovando] = useState(false);

  useEffect(() => {
    async function buscarContrato() {
      if (!contratoId) {
        setMensagem("Contrato não informado.");
        setCarregando(false);
        return;
      }

      const token = sessionStorage.getItem("token");

      if (!token) {
        const destino = `/RevisarContrato?id=${contratoId}`;

        router.replace(`/login?redirect=${encodeURIComponent(destino)}`);
        return;
      }

      try {
        const resposta = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/contratos/${contratoId}/dados`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
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

  function formatarValor(valor) {
    return Number(valor).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarData(data) {
    if (!data) return "Não informada";

    const [ano, mes, dia] = data.slice(0, 10).split("-");
    return `${dia}/${mes}/${ano}`;
  }

  async function aprovarContrato() {
    if (aprovando) return;

    const confirmar = window.confirm(
      "Você confirma que revisou os dados e deseja aprovar este contrato?",
    );

    if (!confirmar) return;

    setAprovando(true);
    setMensagem("");

    try {
      const token = sessionStorage.getItem("token");

      if (!token) {
        setMensagem("Você precisa fazer login novamente.");
        return;
      }

      const resposta = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/contratos/${contratoId}/aprovar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        setMensagem(
          Array.isArray(dados.message)
            ? dados.message.join(", ")
            : dados.message || "Erro ao aprovar contrato.",
        );
        return;
      }

      setContrato((anterior) => ({
        ...anterior,
        status: dados.status,
      }));

      setMensagem("Contrato aprovado com sucesso!");
    } catch {
      setMensagem("Não foi possível conectar ao servidor.");
    } finally {
      setAprovando(false);
    }
  }


async function baixarPDF() {
  try {
    const token = sessionStorage.getItem("token");

    if (!token) {
      setMensagem("Você precisa fazer login novamente.");
      return;
    }

    const resposta = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/contratos/${contratoId}/pdf`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!resposta.ok) {
      setMensagem("Erro ao gerar o PDF do contrato.");
      return;
    }

    const arquivo = await resposta.blob();
    const url = URL.createObjectURL(arquivo);

    const link = document.createElement("a");
    link.href = url;
    link.download = `contrato-${contratoId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (erro) {
    console.error(erro);
    setMensagem("Não foi possível baixar o PDF.");
  }
}

  return (
    <main className="min-h-screen bg-linear-to-b from-ink from-60% to-ink-soft p-6">
      <div className="max-w-2xl mx-auto bg-paper text-slate-darker rounded-xl p-7">
        <h1 className="font-display text-2xl font-bold mb-6">
          Revisar contrato
        </h1>

        {carregando && <p>Carregando contrato...</p>}

        {mensagem && (
          <p role="alert" className="text-red-500">
            {mensagem}
          </p>
        )}

        {contrato && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold">Condições da locação</h2>
            <p>
              <strong>Contrato:</strong> nº {contrato.id}
            </p>

            {/* dados do proprietario */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold">Proprietário (locador)</h2>

              <p>
                <strong>Nome:</strong>{" "}
                {contrato.locador?.nome || "Não informado"}
              </p>
              <p>
                <strong>CPF:</strong> {contrato.locador?.cpf || "Não informado"}
              </p>
              <p>
                <strong>RG:</strong> {contrato.locador?.rg || "Não informado"}
              </p>
              <p>
                <strong>Nacionalidade:</strong>{" "}
                {contrato.locador?.nacionalidade || "Não informada"}
              </p>
              <p>
                <strong>Estado civil:</strong>{" "}
                {contrato.locador?.estado_civil || "Não informado"}
              </p>
              <p>
                <strong>Profissão:</strong>{" "}
                {contrato.locador?.profissao || "Não informada"}
              </p>
            </section>

            <hr />

            {/* dados do inquilino */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold">Inquilino (locatário)</h2>

              <p>
                <strong>Nome:</strong>{" "}
                {contrato.locatario?.nome || "Não informado"}
              </p>
              <p>
                <strong>CPF:</strong>{" "}
                {contrato.locatario?.cpf || "Não informado"}
              </p>
              <p>
                <strong>RG:</strong> {contrato.locatario?.rg || "Não informado"}
              </p>
              <p>
                <strong>Nacionalidade:</strong>{" "}
                {contrato.locatario?.nacionalidade || "Não informada"}
              </p>
              <p>
                <strong>Estado civil:</strong>{" "}
                {contrato.locatario?.estado_civil || "Não informado"}
              </p>
              <p>
                <strong>Profissão:</strong>{" "}
                {contrato.locatario?.profissao || "Não informada"}
              </p>
            </section>

            <hr />

            {/* dados do imovel */}
            <section className="space-y-2">
              <h2 className="text-xl font-bold">Imóvel</h2>

              <p>
                <strong>Endereço:</strong>{" "}
                {contrato.imovel?.logradouro || "Não informado"},{" "}
                {contrato.imovel?.numero || "S/N"}
              </p>

              {contrato.imovel?.complemento && (
                <p>
                  <strong>Complemento:</strong> {contrato.imovel.complemento}
                </p>
              )}

              <p>
                <strong>Bairro:</strong>{" "}
                {contrato.imovel?.bairro || "Não informado"}
              </p>
              <p>
                <strong>Cidade/UF:</strong>{" "}
                {contrato.imovel?.cidade || "Não informada"}/
                {contrato.imovel?.estado || "--"}
              </p>
              <p>
                <strong>CEP:</strong> {contrato.imovel?.cep || "Não informado"}
              </p>
            </section>

            <hr />

            <p>
              <strong>Status:</strong> {contrato.status}
            </p>
            <p>
              <strong>Aluguel:</strong> {formatarValor(contrato.valor_aluguel)}
            </p>
            <p>
              <strong>Índice de reajuste anual:</strong>{" "}
              {contrato.indice_reajuste || "Não informado"}
            </p>
            <p>
              <strong>Início:</strong> {formatarData(contrato.data_inicio)}
            </p>
            <p>
              <strong>Término:</strong> {formatarData(contrato.data_fim)}
            </p>
            <p>
              <strong>Dia do vencimento:</strong> {contrato.dia_vencimento}
            </p>
            <p>
              <strong>Despesas incluídas:</strong>{" "}
              {contrato.despesas_inclusas?.length
                ? contrato.despesas_inclusas.join(", ")
                : "Nenhuma"}
            </p>

            <hr />

            <h2 className="text-lg font-bold">Garantia</h2>

            <p>
              <strong>Tipo:</strong> {contrato.garantia}
            </p>

            {contrato.garantia === "fiador" && (
              <div className="space-y-2">
                <p>
                  <strong>Nome:</strong> {contrato.fiador_nome || "Pendente"}
                </p>
                <p>
                  <strong>CPF:</strong> {contrato.fiador_cpf || "Pendente"}
                </p>
                <p>
                  <strong>Qualificação:</strong>{" "}
                  {contrato.fiador_qualificacao || "Pendente"}
                </p>
                <p>
                  <strong>Imóvel do fiador:</strong>{" "}
                  {contrato.fiador_imovel || "Pendente"}
                </p>
              </div>
            )}

            {contrato.garantia === "seguro" && (
              <div className="space-y-2">
                <p>
                  <strong>Seguradora:</strong>{" "}
                  {contrato.seguro_seguradora || "Pendente"}
                </p>
                <p>
                  <strong>Apólice:</strong>{" "}
                  {contrato.seguro_apolice || "Pendente"}
                </p>
              </div>
            )}

            {contrato.garantia === "caucao" && (
              <p>
                <strong>Valor da caução:</strong>{" "}
                {formatarValor(contrato.valor_caucao)}
              </p>
            )}

            {contrato.garantia === "nenhuma" && (
              <p>Este contrato não possui garantia locatícia.</p>
            )}

            {contrato.status === "AGUARDANDO_REVISAO" && (
              <div className="mt-6 space-y-4">
                <p className="font-semibold">
                  Confira todas as informações antes de aprovar o contrato.
                </p>

                <button
                  type="button"
                  onClick={aprovarContrato}
                  disabled={aprovando}
                  className="w-full bg-ink text-white rounded-lg p-3 disabled:opacity-50"
                >
                  {aprovando ? "Aprovando..." : "Aprovar contrato"}
                </button>
              </div>
            )}

            {contrato.status === "AGUARDANDO_ASSINATURAS" && (
              <div className="mt-6 space-y-4">
                <h2 className="text-xl font-bold">Finalização do contrato</h2>

                <p className="text-sm">
                  Contrato aprovado! Agora você pode gerar o PDF para coletar as
                  assinaturas.
                </p>

                <button
                  type="button"
                onClick={baixarPDF}
                  className="w-full bg-teal text-white rounded-lg p-3 font-bold"
                >
                  Gerar e baixar PDF
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
