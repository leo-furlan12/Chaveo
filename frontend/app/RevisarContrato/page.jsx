"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, FileText, CheckCircle2 } from "lucide-react";

function ConteudoRevisarContrato() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contratoId = searchParams.get("id");

  const apiUrl = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
  ).replace(/\/$/, "");

  const [contrato, setContrato] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);
  const [aprovando, setAprovando] = useState(false);

  const [pdfUrl, setPdfUrl] = useState("");
  const [carregandoPdf, setCarregandoPdf] = useState(false);

  const carregarPreviaPdf = useCallback(async () => {
    if (!contratoId) return;
    const token = sessionStorage.getItem("token");
    if (!token) return;

    setCarregandoPdf(true);
    try {
      const resposta = await fetch(`${apiUrl}/contratos/${contratoId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resposta.ok) return;

      const blob = await resposta.blob();
      const novaUrl = URL.createObjectURL(blob);

      setPdfUrl((urlAnterior) => {
        if (urlAnterior) URL.revokeObjectURL(urlAnterior);
        return novaUrl;
      });
    } catch (err) {
      console.error("Erro ao carregar prévia do PDF:", err);
    } finally {
      setCarregandoPdf(false);
    }
  }, [contratoId, apiUrl]);

  useEffect(() => {
    async function buscarContrato() {
      if (!contratoId) {
        setErro(true);
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
          `${apiUrl}/contratos/${contratoId}/dados`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        const dados = await resposta.json();

        if (!resposta.ok) {
          setErro(true);
          setMensagem(dados.message || "Erro ao buscar contrato.");
          return;
        }

        setContrato(dados);
        carregarPreviaPdf();
      } catch {
        setErro(true);
        setMensagem("Não foi possível conectar ao servidor.");
      } finally {
        setCarregando(false);
      }
    }

    buscarContrato();
  }, [contratoId, apiUrl, router, carregarPreviaPdf]);

  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  function formatarValor(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarData(data) {
    if (!data) return "Não informada";
    const [ano, mes, dia] = String(data).slice(0, 10).split("-");
    if (!ano || !mes || !dia) return data;
    return `${dia}/${mes}/${ano}`;
  }

  async function aprovarContrato() {
    if (aprovando) return;

    const confirmar = window.confirm(
      "Você confirma que revisou todos os dados e deseja aprovar este contrato?"
    );

    if (!confirmar) return;

    setAprovando(true);
    setMensagem("");
    setErro(false);

    try {
      const token = sessionStorage.getItem("token");

      if (!token) {
        setErro(true);
        setMensagem("Você precisa fazer login novamente.");
        return;
      }

      const resposta = await fetch(
        `${apiUrl}/contratos/${contratoId}/aprovar`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(true);
        setMensagem(
          Array.isArray(dados.message)
            ? dados.message.join(", ")
            : dados.message || "Erro ao aprovar contrato."
        );
        return;
      }

      setContrato((anterior) => ({
        ...anterior,
        status: dados.status,
      }));

      setMensagem("Contrato aprovado com sucesso!");
      await carregarPreviaPdf();
    } catch {
      setErro(true);
      setMensagem("Não foi possível conectar ao servidor.");
    } finally {
      setAprovando(false);
    }
  }

  async function baixarPDF() {
    try {
      if (pdfUrl) {
        const link = document.createElement("a");
        link.href = pdfUrl;
        link.download = `contrato-${contratoId}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      const token = sessionStorage.getItem("token");
      if (!token) {
        setErro(true);
        setMensagem("Você precisa fazer login novamente.");
        return;
      }

      const resposta = await fetch(`${apiUrl}/contratos/${contratoId}/pdf`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resposta.ok) {
        setErro(true);
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
    } catch (err) {
      console.error(err);
      setErro(true);
      setMensagem("Não foi possível baixar o PDF.");
    }
  }

  const voltarHref = contrato?.imovel?.id
    ? `/DetalhesContrato?imovelId=${contrato.imovel.id}`
    : "/dashboard";

  return (
    <main className="min-h-screen bg-linear-to-b from-ink from-60% to-ink-soft p-6">
      <div className="max-w-4xl mx-auto bg-paper text-slate-darker rounded-xl p-7 shadow-lg">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href={voltarHref}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              title="Voltar"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-display text-2xl font-bold">
                Dossiê Completo do Contrato
              </h1>
              {contrato && (
                <p className="text-xs text-slate-500">
                  Contrato #{contrato.id} • Status: {contrato.status}
                </p>
              )}
            </div>
          </div>

          {contrato && (
            <button
              type="button"
              onClick={baixarPDF}
              className="inline-flex items-center gap-2 bg-teal text-white font-bold px-4 py-2.5 rounded-lg text-sm hover:opacity-90"
            >
              <Download size={16} />
              Baixar PDF
            </button>
          )}
        </div>

        {carregando && (
          <p className="text-center py-8 text-slate-600">
            Carregando contrato...
          </p>
        )}

        {mensagem && (
          <p
            role={erro ? "alert" : "status"}
            className={`mb-4 rounded-lg p-3 text-sm font-medium ${
              erro
                ? "bg-red-50 border border-red-200 text-red-600"
                : "bg-teal/10 border border-teal/30 text-teal"
            }`}
          >
            {mensagem}
          </p>
        )}

        {contrato && (
          <div className="space-y-6 text-sm">
            {/* Partes lado a lado com qualificação civil completa */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                <h2 className="text-lg font-bold border-b border-slate-200 pb-1 mb-2">
                  Proprietário (Locador)
                </h2>
                <p>
                  <strong>Nome completo:</strong>{" "}
                  {contrato.locador?.nome || "Não informado"}
                </p>
                <p>
                  <strong>CPF:</strong>{" "}
                  {contrato.locador?.cpf || "Não informado"}
                </p>
                <p>
                  <strong>RG:</strong>{" "}
                  {contrato.locador?.rg || "Não informado"}
                </p>
                <p>
                  <strong>Data de nascimento:</strong>{" "}
                  {formatarData(contrato.locador?.data_nascimento)}
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
                <p>
                  <strong>E-mail:</strong>{" "}
                  {contrato.locador?.email || "Não informado"}
                </p>
                <p>
                  <strong>Telefone:</strong>{" "}
                  {contrato.locador?.telefone || "Não informado"}
                </p>
              </section>

              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                <h2 className="text-lg font-bold border-b border-slate-200 pb-1 mb-2">
                  Inquilino (Locatário)
                </h2>
                {contrato.locatario ? (
                  <>
                    <p>
                      <strong>Nome completo:</strong>{" "}
                      {contrato.locatario.nome || "Não informado"}
                    </p>
                    <p>
                      <strong>CPF:</strong>{" "}
                      {contrato.locatario.cpf || "Não informado"}
                    </p>
                    <p>
                      <strong>RG:</strong>{" "}
                      {contrato.locatario.rg || "Não informado"}
                    </p>
                    <p>
                      <strong>Data de nascimento:</strong>{" "}
                      {formatarData(contrato.locatario.data_nascimento)}
                    </p>
                    <p>
                      <strong>Nacionalidade:</strong>{" "}
                      {contrato.locatario.nacionalidade || "Não informada"}
                    </p>
                    <p>
                      <strong>Estado civil:</strong>{" "}
                      {contrato.locatario.estado_civil || "Não informado"}
                    </p>
                    <p>
                      <strong>Profissão:</strong>{" "}
                      {contrato.locatario.profissao || "Não informada"}
                    </p>
                    <p>
                      <strong>E-mail:</strong>{" "}
                      {contrato.locatario.email || "Não informado"}
                    </p>
                    <p>
                      <strong>Telefone:</strong>{" "}
                      {contrato.locatario.telefone || "Não informado"}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-600">
                    Aguardando aceite do convite pelo CPF{" "}
                    <strong>{contrato.cpf_locatario || "não informado"}</strong>
                    .
                  </p>
                )}
              </section>
            </div>

            {/* Imóvel e Condições */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="rounded-lg border border-slate-200 p-4 space-y-1.5">
                <h2 className="text-lg font-bold border-b border-slate-200 pb-1 mb-2">
                  Imóvel Objeto da Locação
                </h2>
                <p>
                  <strong>Tipo:</strong>{" "}
                  {contrato.imovel?.tipo || "Não informado"}
                </p>
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
                  <strong>CEP:</strong>{" "}
                  {contrato.imovel?.cep || "Não informado"}
                </p>
              </section>

              <section className="rounded-lg border border-slate-200 p-4 space-y-1.5">
                <h2 className="text-lg font-bold border-b border-slate-200 pb-1 mb-2">
                  Condições Financeiras e Prazos
                </h2>
                <p>
                  <strong>Valor do aluguel:</strong>{" "}
                  {formatarValor(contrato.valor_aluguel)}
                </p>
                <p>
                  <strong>Índice de reajuste anual:</strong>{" "}
                  {contrato.indice_reajuste || "Não informado"}
                </p>
                <p>
                  <strong>Início da vigência:</strong>{" "}
                  {formatarData(contrato.data_inicio)}
                </p>
                <p>
                  <strong>Término da vigência:</strong>{" "}
                  {formatarData(contrato.data_fim)}
                </p>
                <p>
                  <strong>Dia do vencimento:</strong> Todo dia{" "}
                  {contrato.dia_vencimento}
                </p>
                <p>
                  <strong>Despesas incluídas:</strong>{" "}
                  {contrato.despesas_inclusas?.length
                    ? contrato.despesas_inclusas.join(", ")
                    : "Nenhuma"}
                </p>
              </section>
            </div>

            {/* Garantia Locatícia */}
            <section className="rounded-lg border border-slate-200 p-4 space-y-1.5">
              <h2 className="text-lg font-bold border-b border-slate-200 pb-1 mb-2">
                Garantia Locatícia
              </h2>
              <p>
                <strong>Modalidade:</strong> {contrato.garantia}
              </p>

              {contrato.garantia === "fiador" && (
                <div className="space-y-1.5 pt-1">
                  <p>
                    <strong>Nome do fiador:</strong>{" "}
                    {contrato.fiador_nome || "Pendente"}
                  </p>
                  <p>
                    <strong>CPF do fiador:</strong>{" "}
                    {contrato.fiador_cpf || "Pendente"}
                  </p>
                  <p>
                    <strong>Qualificação do fiador:</strong>{" "}
                    {contrato.fiador_qualificacao || "Pendente"}
                  </p>
                  <p>
                    <strong>Imóvel do fiador:</strong>{" "}
                    {contrato.fiador_imovel || "Pendente"}
                  </p>
                </div>
              )}

              {contrato.garantia === "seguro" && (
                <div className="space-y-1.5 pt-1">
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
            </section>

            {/* Prévia do PDF embutida */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold flex items-center gap-2">
                  <FileText size={19} className="text-teal" />
                  Prévia do Documento (PDF)
                </h2>
                <button
                  type="button"
                  onClick={carregarPreviaPdf}
                  className="text-xs font-semibold text-teal hover:underline"
                >
                  Atualizar prévia
                </button>
              </div>

              {carregandoPdf ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-10 text-center text-slate-500">
                  Gerando prévia do PDF...
                </div>
              ) : pdfUrl ? (
                <iframe
                  src={`${pdfUrl}#view=FitH`}
                  title={`Prévia do Contrato #${contrato.id}`}
                  className="w-full h-[560px] rounded-lg border border-slate-300 bg-slate-100"
                />
              ) : (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center text-slate-500">
                  Prévia indisponível no momento. Utilize o botão &quot;Baixar
                  PDF&quot;.
                </div>
              )}
            </section>

            {/* Ação de aprovação */}
            {contrato.status === "AGUARDANDO_REVISAO" && (
              <div className="pt-2 space-y-3">
                <p className="font-semibold text-center">
                  Confira todas as informações e a prévia do PDF acima antes de
                  aprovar.
                </p>

                <button
                  type="button"
                  onClick={aprovarContrato}
                  disabled={aprovando}
                  className="w-full inline-flex items-center justify-center gap-2 bg-teal text-white font-bold rounded-lg p-3.5 disabled:opacity-50 hover:opacity-90"
                >
                  <CheckCircle2 size={18} />
                  {aprovando ? "Aprovando..." : "Aprovar contrato"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function RevisarContrato() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink" />}>
      <ConteudoRevisarContrato />
    </Suspense>
  );
}