"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  FileText,
  CheckCircle2,
  XCircle,
  Eye,
  Briefcase,
  ShieldCheck,
} from "lucide-react";

function ConteudoAnaliseCadastral() {
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

  // Parecer da análise cadastral (Issue #49)
  const [decisao, setDecisao] = useState("APROVADA");
  const [justificativa, setJustificativa] = useState("");
  const [enviandoParecer, setEnviandoParecer] = useState(false);

  // Prévia do PDF do contrato
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
        const destino = `/AnaliseCadastral?id=${contratoId}`;
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
        if (dados.justificativa_analise) {
          setJustificativa(dados.justificativa_analise);
        }
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

  async function abrirDocumento(nomeArquivo) {
    try {
      const token = sessionStorage.getItem("token");
      const resposta = await fetch(
        `${apiUrl}/contratos/${contratoId}/documentos/${encodeURIComponent(
          nomeArquivo
        )}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!resposta.ok) {
        setErro(true);
        setMensagem("Não foi possível abrir o documento.");
        return;
      }

      const blob = await resposta.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setErro(true);
      setMensagem("Erro ao carregar documento.");
    }
  }

  async function enviarAnaliseCadastral() {
    if (enviandoParecer) return;

    if (!justificativa.trim()) {
      setErro(true);
      setMensagem("Registre a justificativa da decisão antes de confirmar.");
      return;
    }

    const textoConfirmacao =
      decisao === "APROVADA"
        ? "Confirma a APROVAÇÃO do cadastro do inquilino e a liberação do contrato?"
        : "Confirma a RECUSA do cadastro deste inquilino? O contrato será encerrado como recusado.";

    if (!window.confirm(textoConfirmacao)) return;

    setEnviandoParecer(true);
    setErro(false);
    setMensagem("");

    try {
      const token = sessionStorage.getItem("token");
      const resposta = await fetch(
        `${apiUrl}/contratos/${contratoId}/analise-cadastral`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            decisao,
            justificativa: justificativa.trim(),
          }),
        }
      );

      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(true);
        setMensagem(dados.message || "Erro ao registrar análise cadastral.");
        return;
      }

      setContrato((prev) => ({
        ...prev,
        status: dados.status,
        status_analise_cadastral: dados.status_analise_cadastral,
        justificativa_analise: dados.justificativa_analise,
        data_analise_cadastral: dados.data_analise_cadastral,
      }));

      setMensagem(dados.message);
      await carregarPreviaPdf();
    } catch {
      setErro(true);
      setMensagem("Não foi possível conectar ao servidor.");
    } finally {
      setEnviandoParecer(false);
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
      const resposta = await fetch(`${apiUrl}/contratos/${contratoId}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
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
    } catch {
      setErro(true);
      setMensagem("Não foi possível baixar o PDF.");
    }
  }

  const renda = Number(contrato?.renda_mensal_locatario || 0);
  const aluguel = Number(contrato?.valor_aluguel || 0);
  const comprometimento =
    renda > 0 ? Math.round((aluguel / renda) * 100) : null;

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
                Análise Cadastral e Revisão do Contrato
              </h1>
              {contrato && (
                <p className="text-xs text-slate-500">
                  Contrato #{contrato.id} • Status: {contrato.status}
                </p>
              )}
            </div>
          </div>

          {contrato && contrato.status !== "CADASTRO_RECUSADO" && (
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
            Carregando ficha cadastral...
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
            {/* 1. Dados Pessoais do Inquilino + Renda e Ocupação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-1.5">
                <h2 className="text-lg font-bold border-b border-slate-200 pb-1 mb-2">
                  Dados Pessoais do Inquilino
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
                    Inquilino ainda não aceitou o convite.
                  </p>
                )}
              </section>

              {/* 2. Renda, Ocupação e Documentos Enviados */}
              <section className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3">
                <h2 className="text-lg font-bold border-b border-slate-200 pb-1 flex items-center gap-2">
                  <Briefcase size={18} className="text-teal" />
                  Renda, Ocupação e Documentos
                </h2>

                <div className="space-y-1.5">
                  <p>
                    <strong>Ocupação declarada:</strong>{" "}
                    {contrato.ocupacao_locatario || "Não informada"}
                  </p>
                  <p>
                    <strong>Renda mensal declarada:</strong>{" "}
                    {renda > 0 ? formatarValor(renda) : "Não informada"}
                  </p>
                  <p>
                    <strong>Valor do aluguel:</strong> {formatarValor(aluguel)}
                  </p>

                  {comprometimento !== null && (
                    <div className="pt-1">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                          comprometimento <= 30
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        Comprometimento da renda: {comprometimento}%{" "}
                        {comprometimento <= 30
                          ? "(Dentro do ideal ≤ 30%)"
                          : "(Acima de 30% da renda)"}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <p className="font-bold text-slate-700">
                    Documentos enviados pelo inquilino:
                  </p>
                  {contrato.documentos_locatario?.length > 0 ? (
                    <ul className="space-y-2">
                      {contrato.documentos_locatario.map((doc, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between gap-2 bg-white border border-slate-200 rounded-lg px-3 py-2"
                        >
                          <div className="truncate">
                            <p className="font-semibold text-xs">{doc.tipo}</p>
                            <p className="text-xs text-slate-500 truncate">
                              {doc.nome_original}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => abrirDocumento(doc.arquivo)}
                            className="inline-flex items-center gap-1 text-xs font-bold text-teal hover:underline shrink-0"
                          >
                            <Eye size={14} /> Abrir
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Nenhum documento anexado.
                    </p>
                  )}
                </div>
              </section>
            </div>

            {/* 3. Garantia Locatícia + Condições do Contrato */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <section className="rounded-lg border border-slate-200 p-4 space-y-1.5">
                <h2 className="text-lg font-bold border-b border-slate-200 pb-1 mb-2 flex items-center gap-2">
                  <ShieldCheck size={18} className="text-teal" />
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

              <section className="rounded-lg border border-slate-200 p-4 space-y-1.5">
                <h2 className="text-lg font-bold border-b border-slate-200 pb-1 mb-2">
                  Imóvel e Condições da Locação
                </h2>
                <p>
                  <strong>Imóvel:</strong> {contrato.imovel?.logradouro},{" "}
                  {contrato.imovel?.numero} — {contrato.imovel?.cidade}/
                  {contrato.imovel?.estado}
                </p>
                <p>
                  <strong>Vigência:</strong> {formatarData(contrato.data_inicio)}{" "}
                  até {formatarData(contrato.data_fim)}
                </p>
                <p>
                  <strong>Vencimento:</strong> Todo dia{" "}
                  {contrato.dia_vencimento} ({contrato.indice_reajuste})
                </p>
                <p>
                  <strong>Despesas incluídas:</strong>{" "}
                  {contrato.despesas_inclusas?.length
                    ? contrato.despesas_inclusas.join(", ")
                    : "Nenhuma"}
                </p>
                <p>
                  <strong>Proprietário:</strong> {contrato.locador?.nome} (CPF:{" "}
                  {contrato.locador?.cpf})
                </p>
              </section>
            </div>

            {/* 4. Parecer da Análise Cadastral (Aprovar ou Recusar com Justificativa) */}
            <section className="rounded-xl border-2 border-slate-300 bg-slate-50 p-5 space-y-4">
              <h2 className="text-lg font-bold">
                Parecer da Análise Cadastral
              </h2>

              {contrato.status === "AGUARDANDO_REVISAO" ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setDecisao("APROVADA")}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border font-bold transition ${
                        decisao === "APROVADA"
                          ? "bg-teal text-white border-teal"
                          : "bg-white text-slate-700 border-slate-300"
                      }`}
                    >
                      <CheckCircle2 size={18} />
                      Aprovar Cadastro e Contrato
                    </button>

                    <button
                      type="button"
                      onClick={() => setDecisao("RECUSADA")}
                      className={`flex items-center justify-center gap-2 p-3 rounded-lg border font-bold transition ${
                        decisao === "RECUSADA"
                          ? "bg-red-600 text-white border-red-600"
                          : "bg-white text-slate-700 border-slate-300"
                      }`}
                    >
                      <XCircle size={18} />
                      Recusar Cadastro
                    </button>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">
                      Justificativa da decisão *
                    </label>
                    <textarea
                      rows={3}
                      value={justificativa}
                      onChange={(e) => setJustificativa(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg p-3"
                      placeholder={
                        decisao === "APROVADA"
                          ? "Ex: Documentação conferida e renda compatível com o valor da locação."
                          : "Ex: Renda comprovada insuficiente ou documentação divergente."
                      }
                    />
                  </div>

                  <button
                    type="button"
                    onClick={enviarAnaliseCadastral}
                    disabled={enviandoParecer}
                    className={`w-full text-white font-bold rounded-lg p-3.5 disabled:opacity-50 ${
                      decisao === "APROVADA"
                        ? "bg-teal hover:opacity-90"
                        : "bg-red-600 hover:opacity-90"
                    }`}
                  >
                    {enviandoParecer
                      ? "Registrando decisão..."
                      : decisao === "APROVADA"
                      ? "Confirmar Aprovação e Liberar PDF"
                      : "Confirmar Recusa do Cadastro"}
                  </button>
                </>
              ) : (
                <div className="space-y-1.5">
                  <p>
                    <strong>Resultado da análise:</strong>{" "}
                    <span
                      className={
                        contrato.status_analise_cadastral === "RECUSADA"
                          ? "text-red-600 font-bold"
                          : "text-teal font-bold"
                      }
                    >
                      {contrato.status_analise_cadastral || "APROVADA"}
                    </span>
                  </p>
                  {contrato.justificativa_analise && (
                    <p>
                      <strong>Justificativa registrada:</strong>{" "}
                      {contrato.justificativa_analise}
                    </p>
                  )}
                </div>
              )}
            </section>

            {/* 5. Prévia do PDF embutida */}
            {contrato.status !== "CADASTRO_RECUSADO" && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <FileText size={19} className="text-teal" />
                    Prévia do Contrato (PDF)
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
                    Prévia indisponível no momento.
                  </div>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function AnaliseCadastral() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink" />}>
      <ConteudoAnaliseCadastral />
    </Suspense>
  );
}