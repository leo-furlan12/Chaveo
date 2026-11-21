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
};

function ConteudoDetalhesContrato() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const imovelId = searchParams.get("imovelId");
  const contratoIdParam = searchParams.get("id");

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
                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <p className="text-sm font-semibold">
                    Link de convite para o inquilino (CPF:{" "}
                    {contrato.cpf_locatario}):
                  </p>
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
                <div className="pt-2 border-t border-slate-200 text-sm text-slate-700">
                  O inquilino já aceitou o convite e está concluindo o
                  preenchimento dos dados da garantia. Esta tela atualiza
                  automaticamente.
                </div>
              )}

              {contrato.status === "AGUARDANDO_REVISAO" && (
                <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    O inquilino concluiu o preenchimento! Revise os dados para
                    aprovar o contrato.
                  </p>
                  <Link
                    href={`/RevisarContrato?id=${contrato.id}`}
                    className="inline-flex items-center justify-center bg-teal text-white font-bold px-4 py-2.5 rounded-lg text-sm whitespace-nowrap"
                  >
                    Revisar e Aprovar
                  </Link>
                </div>
              )}

              {(contrato.status === "AGUARDANDO_ASSINATURAS" ||
                contrato.status === "CONCLUIDO") && (
                <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium">
                    Contrato aprovado e pronto para assinatura.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={baixarPDF}
                      className="inline-flex items-center gap-2 bg-teal text-white font-bold px-4 py-2.5 rounded-lg text-sm"
                    >
                      <Download size={16} />
                      Baixar PDF
                    </button>
                    <Link
                      href={`/RevisarContrato?id=${contrato.id}`}
                      className="inline-flex items-center gap-2 bg-slate-200 text-slate-800 font-semibold px-4 py-2.5 rounded-lg text-sm"
                    >
                      Ver página de revisão
                    </Link>
                  </div>
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
                <>
                  <p>
                    <strong>Seguradora:</strong>{" "}
                    {contrato.seguro_seguradora || "Pendente"}
                  </p>
                  <p>
                    <strong>Apólice:</strong>{" "}
                    {contrato.seguro_apolice || "Pendente"}
                  </p>
                </>
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