"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  FileText,
  Download,
  Plus,
  RefreshCw,
} from "lucide-react";

const STATUS_CONFIG = {
  RASCUNHO: {
    rotulo: "Rascunho (Convite não gerado)",
    cor: "bg-slate-200 text-slate-800",
    etapa: 1,
  },
  AGUARDANDO_INQUILINO: {
    rotulo: "Aguardando inquilino aceitar o convite",
    cor: "bg-amber-100 text-amber-800",
    etapa: 1,
  },
  PENDENTE_DADOS: {
    rotulo: "Inquilino preenchendo dados complementares",
    cor: "bg-blue-100 text-blue-800",
    etapa: 2,
  },
  CANCELADO: {
    rotulo: "Contrato cancelado",
    cor: "bg-red-100 text-red-800",
    etapa: 2,
  },
  AGUARDANDO_REVISAO: {
    rotulo: "Pronto para revisão do proprietário",
    cor: "bg-purple-100 text-purple-800",
    etapa: 2,
  },
  AGUARDANDO_ASSINATURAS: {
    rotulo: "Aprovado — Aguardando assinaturas",
    cor: "bg-teal/20 text-teal",
    etapa: 3,
  },
  CONCLUIDO: {
    rotulo: "Contrato Concluído",
    cor: "bg-emerald-100 text-emerald-800",
    etapa: 3,
  },
  CADASTRO_RECUSADO: {
  rotulo: "Cadastro recusado na análise cadastral",
  cor: "bg-red-100 text-red-800",
  etapa: 2,
},
};

function ConteudoDetalhesContrato() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const imovelId = searchParams.get("imovelId");
  const contratoIdParam = searchParams.get("id");
  const [arquivoAssinado, setArquivoAssinado] = useState(null);
  const [enviandoAssinatura, setEnviandoAssinatura] = useState(false);
  const apiUrl = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
  ).replace(/\/$/, "");

  const [contrato, setContrato] = useState(null);
  const [semContrato, setSemContrato] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [feedback, setFeedback] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [gerandoConvite, setGerandoConvite] = useState(false);
  const [cancelando, setCancelando] = useState(false);

  const carregarContrato = useCallback(
    async (silencioso = false) => {
      if (!imovelId && !contratoIdParam) {
        setErro("Imóvel ou contrato não informado.");
        setCarregando(false);
        return;
      }

      const token = sessionStorage.getItem("token");
      if (!token) {
        const destino = imovelId
          ? `/DetalhesContrato?imovelId=${imovelId}`
          : `/DetalhesContrato?id=${contratoIdParam}`;
        router.replace(`/login?redirect=${encodeURIComponent(destino)}`);
        return;
      }

      if (!silencioso) setCarregando(true);
      setErro("");

      try {
        const endpoint = imovelId
          ? `${apiUrl}/contratos/imovel/${imovelId}`
          : `${apiUrl}/contratos/${contratoIdParam}/dados`;

        const resposta = await fetch(endpoint, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (resposta.status === 404 && imovelId) {
          setSemContrato(true);
          setContrato(null);
          return;
        }

        const dados = await resposta.json();
        if (!resposta.ok) {
          setErro(dados.message || "Erro ao carregar detalhes do contrato.");
          return;
        }

        setSemContrato(false);
        setContrato(dados);
      } catch {
        setErro("Não foi possível conectar ao servidor.");
      } finally {
        if (!silencioso) setCarregando(false);
      }
    },
    [imovelId, contratoIdParam, apiUrl, router]
  );

  useEffect(() => {
    carregarContrato();
  }, [carregarContrato]);

  useEffect(() => {
    if (!contrato) return;
    if (
      contrato.status !== "AGUARDANDO_INQUILINO" &&
      contrato.status !== "PENDENTE_DADOS"
    ) {
      return;
    }

    const intervalo = setInterval(() => {
      carregarContrato(true);
    }, 5000);

    return () => clearInterval(intervalo);
  }, [contrato, carregarContrato]);

  const linkConvite =
    contrato?.convite_token && typeof window !== "undefined"
      ? `${window.location.origin}/ConviteContrato?token=${contrato.convite_token}`
      : "";

  async function copiarLink() {
    if (!linkConvite) return;
    try {
      await navigator.clipboard.writeText(linkConvite);
      setCopiado(true);
      setFeedback("Link de convite copiado para a área de transferência!");
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      setErro("Não foi possível copiar o link.");
    }
  }

  async function gerarConvite() {
    if (!contrato?.id || gerandoConvite) return;
    setGerandoConvite(true);
    setErro("");
    setFeedback("");

    try {
      const token = sessionStorage.getItem("token");
      const resposta = await fetch(
        `${apiUrl}/contratos/${contrato.id}/convite`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.message || "Erro ao gerar link de convite.");
        return;
      }

      setContrato((prev) => ({
        ...prev,
        convite_token: dados.convite_token,
        status: dados.status,
      }));
      setFeedback("Link de convite gerado com sucesso!");
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setGerandoConvite(false);
    }
  }

  const podeCancelar = ["AGUARDANDO_INQUILINO", "PENDENTE_DADOS"].includes(contrato?.status);

  async function cancelarContrato() {
    if (!podeCancelar || cancelando) return;
    if (!window.confirm("Cancelar este contrato? O convite e o envio de dados ficarão indisponíveis.")) return;

    const token = sessionStorage.getItem("token");
    if (!token) {
      setErro("Você precisa fazer login novamente.");
      return;
    }

    setCancelando(true);
    setErro("");
    setFeedback("");

    try {
      const resposta = await fetch(`${apiUrl}/contratos/${contrato.id}/cancelar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const dados = await resposta.json().catch(() => ({}));

      if (!resposta.ok) {
        throw new Error(dados.message || "Não foi possível cancelar o contrato.");
      }

      setContrato((atual) => ({ ...atual, status: dados.status, convite_token: null }));
      setFeedback(dados.mensagem);
    } catch (falha) {
      setErro(falha.message || "Não foi possível cancelar o contrato.");
    } finally {
      setCancelando(false);
    }
  }

  async function baixarPDF() {
    try {
      const token = sessionStorage.getItem("token");
      const resposta = await fetch(`${apiUrl}/contratos/${contrato.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!resposta.ok) {
        setErro("Erro ao gerar o PDF do contrato.");
        return;
      }

      const arquivo = await resposta.blob();
      const url = URL.createObjectURL(arquivo);
      const link = document.createElement("a");
      link.href = url;
      link.download = `contrato-${contrato.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setErro("Não foi possível baixar o PDF.");
    }
  }

  function formatarValor(valor) {
    return Number(valor || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarData(data) {
    if (!data) return "Não informada";
    const [ano, mes, dia] = data.slice(0, 10).split("-");
    return `${dia}/${mes}/${ano}`;
  }

  const infoStatus = contrato
    ? STATUS_CONFIG[contrato.status] || {
        rotulo: contrato.status,
        cor: "bg-slate-200 text-slate-800",
        etapa: 1,
      }
    : null;

  async function baixarContratoAssinado() {
    try {
      const token = sessionStorage.getItem("token");
      const resposta = await fetch(
        `${apiUrl}/contratos/${contrato.id}/contrato-assinado`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!resposta.ok) {
        setErro("Não foi possível abrir o contrato assinado.");
        return;
      }

      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `contrato-${contrato.id}-assinado.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setErro("Erro ao baixar o contrato assinado.");
    }
  }

  async function enviarContratoAssinado() {
    if (!contrato?.id || enviandoAssinatura) return;

    if (!arquivoAssinado) {
      setErro("Selecione o arquivo do contrato assinado antes de enviar.");
      return;
    }

    setEnviandoAssinatura(true);
    setErro("");
    setFeedback("");

    try {
      const token = sessionStorage.getItem("token");
      const formData = new FormData();
      formData.append("arquivo", arquivoAssinado);

      const resposta = await fetch(
        `${apiUrl}/contratos/${contrato.id}/upload-assinatura`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.message || "Erro ao enviar o contrato assinado.");
        return;
      }

      setContrato((prev) => ({
        ...prev,
        ...dados,
      }));
      setArquivoAssinado(null);
      setFeedback(dados.message);
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setEnviandoAssinatura(false);
    }
  }
const [seguradora, setSeguradora] = useState("");
  const [apolice, setApolice] = useState("");
  const [salvandoSeguro, setSalvandoSeguro] = useState(false);

  useEffect(() => {
    if (contrato?.garantia === "seguro") {
      setSeguradora(contrato.seguro_seguradora || "");
      setApolice(contrato.seguro_apolice || "");
    }
  }, [contrato]);

  async function salvarDadosSeguro(e) {
    e.preventDefault();
    if (!contrato?.id || salvandoSeguro) return;

    setSalvandoSeguro(true);
    setErro("");
    setFeedback("");

    try {
      const token = sessionStorage.getItem("token");
      const resposta = await fetch(`${apiUrl}/contratos/${contrato.id}/seguro`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          seguro_seguradora: seguradora,
          seguro_apolice: apolice,
        }),
      });

      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(dados.message || "Erro ao salvar dados do seguro-fiança.");
        return;
      }

      setContrato((prev) => ({
        ...prev,
        seguro_seguradora: dados.seguro_seguradora,
        seguro_apolice: dados.seguro_apolice,
      }));
      setFeedback(dados.message);
    } catch {
      setErro("Não foi possível conectar ao servidor.");
    } finally {
      setSalvandoSeguro(false);
    }
  }
  return (
    <main className="min-h-screen bg-linear-to-b from-ink from-60% to-ink-soft p-6 text-slate-darker">
      <div className="max-w-3xl mx-auto bg-paper rounded-xl p-7 shadow-lg">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              title="Voltar para Dashboard"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-display text-2xl font-bold">
                Detalhes do Contrato
              </h1>
              {imovelId && (
                <p className="text-xs text-slate-500">Imóvel #{imovelId}</p>
              )}
            </div>
          </div>

          {contrato && (
            <button
              type="button"
              onClick={() => carregarContrato()}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              title="Atualizar status"
            >
              <RefreshCw size={18} />
            </button>
          )}
        </div>

        {carregando && (
          <p className="text-center py-8 text-slate-600">
            Carregando informações do contrato...
          </p>
        )}

        {erro && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-red-50 border border-red-200 p-4 text-red-700 text-sm"
          >
            {erro}
          </div>
        )}

        {feedback && (
          <div
            role="status"
            className="mb-4 rounded-lg bg-teal/10 border border-teal/30 p-3 text-teal text-sm font-medium"
          >
            {feedback}
          </div>
        )}

        {!carregando && semContrato && (
          <div className="text-center py-10 space-y-4">
            <FileText size={40} className="mx-auto text-slate-400" />
            <h2 className="text-lg font-bold">
              Nenhum contrato encontrado para este imóvel
            </h2>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Este imóvel ainda não possui um contrato de locação vinculado.
              Você pode iniciar o cadastro agora mesmo.
            </p>
            <div className="pt-2">
              <Link
                href={`/CadastroContrato?imovelId=${imovelId}`}
                className="inline-flex items-center gap-2 bg-teal text-white font-bold px-5 py-3 rounded-lg hover:opacity-90"
              >
                <Plus size={18} />
                Criar Contrato para este Imóvel
              </Link>
            </div>
          </div>
        )}

        {!carregando && contrato && (
          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-bold text-slate-600">
                  Contrato #{contrato.id}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-bold ${infoStatus.cor}`}
                >
                  {infoStatus.rotulo}
                </span>
              </div>

              <div>
                <div className="flex gap-2">
                  <div className="h-2 flex-1 rounded-full bg-teal" />
                  <div
                    className={`h-2 flex-1 rounded-full ${
                      infoStatus.etapa >= 2 ? "bg-teal" : "bg-slate-300"
                    }`}
                  />
                  <div
                    className={`h-2 flex-1 rounded-full ${
                      infoStatus.etapa >= 3 ? "bg-teal" : "bg-slate-300"
                    }`}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-xs text-center text-slate-600">
                  <p className="font-semibold text-teal">1. Cadastro & Convite</p>
                  <p
                    className={
                      infoStatus.etapa >= 2 ? "font-semibold text-teal" : ""
                    }
                  >
                    2. Dados & Revisão
                  </p>
                  <p
                    className={
                      infoStatus.etapa >= 3 ? "font-semibold text-teal" : ""
                    }
                  >
                    3. Aprovado / PDF
                  </p>
                </div>
              </div>

              {contrato.status === "RASCUNHO" && (
                <div className="pt-2 border-t border-slate-200">
                  <p className="text-sm mb-3">
                    O contrato está em rascunho. Gere o link de convite para
                    enviar ao inquilino (CPF: {contrato.cpf_locatario}).
                  </p>
                  <button
                    type="button"
                    onClick={gerarConvite}
                    disabled={gerandoConvite}
                    className="bg-teal text-white font-bold px-4 py-2.5 rounded-lg text-sm disabled:opacity-50"
                  >
                    {gerandoConvite ? "Gerando..." : "Gerar link de convite"}
                  </button>
                </div>
              )}

             {contrato.status === "AGUARDANDO_INQUILINO" && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">
                      Link de convite para o inquilino (CPF:{" "}
                      {contrato.cpf_locatario}):
                    </p>
                    {imovelId && (
                      <Link
                        href={`/CadastroContrato?imovelId=${imovelId}&editar=true`}
                        className="text-xs font-bold text-teal hover:underline"
                      >
                        Editar dados do contrato
                      </Link>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      readOnly
                      value={linkConvite}
                      className="flex-1 bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-700"
                    />
                    <button
                      type="button"
                      onClick={copiarLink}
                      className="inline-flex items-center justify-center gap-2 bg-teal text-white font-bold px-4 py-2 rounded-lg text-sm"
                    >
                      {copiado ? <Check size={16} /> : <Copy size={16} />}
                      {copiado ? "Copiado!" : "Copiar link"}
                    </button>
                  </div>
                </div>
              )}

              {contrato.status === "PENDENTE_DADOS" && (
                <div className="space-y-3 border-t border-slate-200 pt-3">
                  <p className="text-sm text-slate-700">
                    O inquilino já aceitou o convite e está preenchendo os dados.
                  </p>
                </div>
              )}

              {podeCancelar && (
                <div className="flex justify-center border-t border-slate-200 pt-3">
                  <button
                    type="button"
                    onClick={cancelarContrato}
                    disabled={cancelando}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    {cancelando ? "Cancelando..." : "Cancelar contrato"}
                  </button>
                </div>
              )}

              {contrato.status === "CANCELADO" && (
                <div className="flex justify-center border-t border-slate-200 pt-3">
                  {imovelId && (
                    <Link
                      href={`/CadastroContrato?imovelId=${imovelId}&novo=true`}
                      className="inline-flex items-center gap-2 rounded-lg bg-teal px-4 py-2.5 text-sm font-bold text-white"
                    >
                      <Plus size={16} />
                      Iniciar novo contrato
                    </Link>
                  )}
                </div>
              )}

              {contrato.status === "AGUARDANDO_REVISAO" && (
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    O inquilino concluiu o preenchimento! Revise os dados para
                    aprovar o contrato.
                  </p>
                  <Link
                    href={`/AnaliseCadastral?id=${contrato.id}`}
                    className="inline-flex items-center justify-center bg-teal text-white font-bold px-4 py-2.5 rounded-lg text-sm whitespace-nowrap"
                  >
                    Revisar e Aprovar
                  </Link>
                </div>
              )}
              {contrato.status === "CADASTRO_RECUSADO" && (
                <div className="pt-3 border-t border-slate-200 space-y-3">
                  <p className="text-sm text-red-700">
                    <strong>Motivo da recusa:</strong>{" "}
                    {contrato.justificativa_analise || "Não informado"}
                  </p>
                  {imovelId && (
                    <Link
                      href={`/CadastroContrato?imovelId=${imovelId}&novo=true`}
                      className="mx-auto flex w-fit items-center gap-2 bg-teal text-white font-bold px-4 py-2.5 rounded-lg text-sm"
                    >
                      <Plus size={16} />
                      Iniciar Novo Contrato para este Imóvel
                    </Link>
                  )}
                </div>
              )}

              {(contrato.status === "AGUARDANDO_ASSINATURAS" ||
    contrato.status === "CONCLUIDO") && (
    <div className="pt-3 border-t border-slate-200 space-y-4">
      {contrato.status === "CONCLUIDO" ? (
        <div className="rounded-lg border border-teal/30 bg-teal/10 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-teal text-sm">
                ✓ Contrato concluído e assinado!
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Enviado em{" "}
                {contrato.data_assinatura_final
                  ? new Date(contrato.data_assinatura_final).toLocaleString(
                      "pt-BR",
                      { dateStyle: "short", timeStyle: "short" }
                    )
                  : "data registrada"}{" "}
                • Imóvel atualizado para Alugado.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={baixarContratoAssinado}
                className="inline-flex items-center gap-2 bg-teal text-white font-bold px-4 py-2.5 rounded-lg text-xs"
              >
                <Download size={15} />
                Baixar Contrato Assinado
              </button>

              <Link
                href={`/AnaliseCadastral?id=${contrato.id}`}
                className="inline-flex items-center gap-2 bg-white border border-slate-300 text-slate-800 font-semibold px-4 py-2.5 rounded-lg text-xs"
              >
                Ver análise cadastral
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <p className="font-bold text-sm">
                Finalização e Coleta de Assinaturas
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                1º Baixe o PDF aprovado. 2º Assine junto com o inquilino e faça
                o upload do documento único assinado abaixo.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={baixarPDF}
                className="inline-flex items-center gap-2 bg-teal text-white font-bold px-3.5 py-2 rounded-lg text-xs"
              >
                <Download size={15} />
                Baixar PDF
              </button>

              <Link
                href={`/AnaliseCadastral?id=${contrato.id}`}
                className="inline-flex items-center gap-2 bg-slate-100 text-slate-800 font-semibold px-3.5 py-2 rounded-lg text-xs"
              >
                Análise cadastral
              </Link>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700">
              Anexar contrato assinado por ambas as partes (PDF, JPG ou PNG):
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) =>
                  setArquivoAssinado(e.target.files?.[0] || null)
                }
                className="flex-1 text-xs border border-dashed border-slate-300 rounded-lg p-2"
              />
              <button
                type="button"
                onClick={enviarContratoAssinado}
                disabled={enviandoAssinatura}
                className="bg-ink text-white font-bold px-4 py-2 rounded-lg text-xs disabled:opacity-50 whitespace-nowrap"
              >
                {enviandoAssinatura
                  ? "Enviando..."
                  : "Enviar Contrato Assinado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )}
            </section>

            {contrato.imovel && (
              <section className="space-y-1 text-sm">
                <h2 className="text-lg font-bold border-b pb-1 mb-2">Imóvel</h2>
                <p>
                  <strong>Tipo:</strong> {contrato.imovel.tipo || "Imóvel"}
                </p>
                <p>
                  <strong>Endereço:</strong> {contrato.imovel.logradouro},{" "}
                  {contrato.imovel.numero}
                  {contrato.imovel.complemento
                    ? ` - ${contrato.imovel.complemento}`
                    : ""}
                </p>
                <p>
                  <strong>Bairro:</strong> {contrato.imovel.bairro} —{" "}
                  {contrato.imovel.cidade}/{contrato.imovel.estado}
                </p>
                <p>
                  <strong>CEP:</strong> {contrato.imovel.cep}
                </p>
              </section>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <section className="space-y-1">
                <h2 className="text-lg font-bold border-b pb-1 mb-2">
                  Proprietário (Locador)
                </h2>
                <p>
                  <strong>Nome:</strong>{" "}
                  {contrato.locador?.nome || "Não informado"}
                </p>
                <p>
                  <strong>CPF:</strong>{" "}
                  {contrato.locador?.cpf || "Não informado"}
                </p>
                <p>
                  <strong>Profissão:</strong>{" "}
                  {contrato.locador?.profissao || "Não informada"}
                </p>
              </section>

              <section className="space-y-1">
                <h2 className="text-lg font-bold border-b pb-1 mb-2">
                  Inquilino (Locatário)
                </h2>
                {contrato.locatario ? (
                  <>
                    <p>
                      <strong>Nome:</strong> {contrato.locatario.nome}
                    </p>
                    <p>
                      <strong>CPF:</strong> {contrato.locatario.cpf}
                    </p>
                    <p>
                      <strong>Profissão:</strong>{" "}
                      {contrato.locatario.profissao || "Não informada"}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-600">
                    Convite enviado para o CPF{" "}
                    <strong>{contrato.cpf_locatario}</strong> (aguardando
                    aceite).
                  </p>
                )}
              </section>
            </div>

            <section className="space-y-1 text-sm">
              <h2 className="text-lg font-bold border-b pb-1 mb-2">
                Condições da Locação
              </h2>
              <p>
                <strong>Valor do aluguel:</strong>{" "}
                {formatarValor(contrato.valor_aluguel)}
              </p>
              <p>
                <strong>Dia do vencimento:</strong> Todo dia{" "}
                {contrato.dia_vencimento}
              </p>
              <p>
                <strong>Índice de reajuste:</strong>{" "}
                {contrato.indice_reajuste || "Não informado"}
              </p>
              <p>
                <strong>Vigência:</strong> {formatarData(contrato.data_inicio)}{" "}
                até {formatarData(contrato.data_fim)}
              </p>
              <p>
                <strong>Despesas inclusas:</strong>{" "}
                {contrato.despesas_inclusas?.length
                  ? contrato.despesas_inclusas.join(", ")
                  : "Nenhuma"}
              </p>
            </section>

            <section className="space-y-1 text-sm">
              <h2 className="text-lg font-bold border-b pb-1 mb-2">
                Garantia Locatícia
              </h2>
              <p>
                <strong>Modalidade:</strong> {contrato.garantia}
              </p>
              {contrato.garantia === "caucao" && (
                <p>
                  <strong>Valor da caução:</strong>{" "}
                  {formatarValor(contrato.valor_caucao)}
                </p>
              )}
              {contrato.garantia === "fiador" && (
                <>
                  <p>
                    <strong>Fiador:</strong>{" "}
                    {contrato.fiador_nome || "Aguardando preenchimento"}
                  </p>
                  {contrato.fiador_cpf && (
                    <p>
                      <strong>CPF do fiador:</strong> {contrato.fiador_cpf}
                    </p>
                  )}
                </>
              )}
             {contrato.garantia === "seguro" && (
                <form onSubmit={salvarDadosSeguro} className="space-y-3 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold mb-1">
                        Seguradora
                      </label>
                      <input
                        type="text"
                        value={seguradora}
                        onChange={(e) => setSeguradora(e.target.value)}
                        placeholder="Ex: Porto Seguro"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">
                        Número da Apólice
                      </label>
                      <input
                        type="text"
                        value={apolice}
                        onChange={(e) => setApolice(e.target.value)}
                        placeholder="Ex: 000123456-7"
                        className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                  {contrato.status !== "CONCLUIDO" && (
                    <button
                      type="submit"
                      disabled={salvandoSeguro}
                      className="bg-ink text-white font-bold px-4 py-2 rounded-lg text-xs disabled:opacity-50"
                    >
                      {salvandoSeguro
                        ? "Salvando..."
                        : "Salvar Dados do Seguro-Fiança"}
                    </button>
                  )}
                </form>
              )}
            </section>
          </div>
        )}
      </div>
    </main>
  );
}

export default function DetalhesContrato() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink" />}>
      <ConteudoDetalhesContrato />
    </Suspense>
  );
}
