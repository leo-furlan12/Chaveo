"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Upload, FileCheck2, CheckCircle2 } from "lucide-react"

function ConteudoCompletarContrato() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const contratoId = searchParams.get("id");

  const apiUrl = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
  ).replace(/\/$/, "");

  const [contrato, setContrato] = useState(null);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  // Dados da ficha cadastral (Issue #49)
  const [rendaMensal, setRendaMensal] = useState("");
  const [ocupacao, setOcupacao] = useState("");
  const [docIdentidade, setDocIdentidade] = useState(null);
  const [docRenda, setDocRenda] = useState(null);
  const [docResidencia, setDocResidencia] = useState(null);
  const [fichaSalva, setFichaSalva] = useState(false);

  // Dados do fiador (quando garantia === 'fiador')
  const [fiadorNome, setFiadorNome] = useState("");
  const [fiadorCpf, setFiadorCpf] = useState("");
  const [fiadorQualificacao, setFiadorQualificacao] = useState("");
  const [fiadorImovel, setFiadorImovel] = useState("");
  const [fiadorSalvo, setFiadorSalvo] = useState(false);

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
        const destino = `/CompletarContrato?id=${contratoId}`;
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
        if (dados.renda_mensal_locatario) {
          setRendaMensal(String(dados.renda_mensal_locatario));
        }
        setOcupacao(dados.locatario?.profissao || dados.ocupacao_locatario || "");
        if (dados.documentos_locatario?.length > 0) {
          setFichaSalva(true);
        }
        if (dados.fiador_nome) {
          setFiadorNome(dados.fiador_nome);
          setFiadorCpf(dados.fiador_cpf || "");
          setFiadorQualificacao(dados.fiador_qualificacao || "");
          setFiadorImovel(dados.fiador_imovel || "");
          setFiadorSalvo(true);
        }
      } catch {
        setErro(true);
        setMensagem("Não foi possível conectar ao servidor.");
      } finally {
        setCarregando(false);
      }
    }

    buscarContrato();
  }, [contratoId, apiUrl, router]);

  async function salvarFichaCadastral() {
    if (salvando) return;
    setErro(false);
    setMensagem("");

    if (!rendaMensal || Number(rendaMensal) <= 0) {
      setErro(true);
      setMensagem("Informe sua renda mensal comprovada.");
      return;
    }

    if (!ocupacao.trim()) {
      setErro(true);
      setMensagem("Informe sua ocupação / cargo atual.");
      return;
    }

    const qtdDocsAnteriores = Array.isArray(contrato?.documentos_locatario)
      ? contrato.documentos_locatario.length
      : 0;

    if (
      qtdDocsAnteriores < 3 &&
      (!docIdentidade || !docRenda || !docResidencia)
    ) {
      setErro(true);
      setMensagem(
        "Anexe todos os 3 documentos obrigatórios (Identidade, Comprovante de Renda e Comprovante de Residência) antes de salvar."
      );
      return;
    }

    setSalvando(true);

    try {
      const token = sessionStorage.getItem("token");
      const formData = new FormData();
      formData.append("renda_mensal", rendaMensal);
      formData.append("ocupacao", ocupacao.trim());

      const tipos = [];
      if (docIdentidade) {
        formData.append("documentos", docIdentidade);
        tipos.push("Documento de Identidade (RG/CNH)");
      }
      if (docRenda) {
        formData.append("documentos", docRenda);
        tipos.push("Comprovante de Renda");
      }
      if (docResidencia) {
        formData.append("documentos", docResidencia);
        tipos.push("Comprovante de Residência");
      }
      formData.append("tipos_documentos", JSON.stringify(tipos));

      const resposta = await fetch(
        `${apiUrl}/contratos/${contratoId}/ficha-cadastral`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const dados = await resposta.json();
      if (!resposta.ok) {
        setErro(true);
        setMensagem(
          Array.isArray(dados.message)
            ? dados.message.join(", ")
            : dados.message || "Erro ao enviar ficha cadastral."
        );
        return;
      }

      setContrato((prev) => ({
        ...prev,
        renda_mensal_locatario: dados.renda_mensal_locatario,
        ocupacao_locatario: dados.ocupacao_locatario,
        locatario: { ...prev.locatario, profissao: dados.ocupacao_locatario },
        documentos_locatario: dados.documentos_locatario,
      }));
      setOcupacao(dados.ocupacao_locatario);
      setFichaSalva(true);
      setMensagem("Ficha cadastral e documentos enviados com sucesso!");
    } catch {
      setErro(true);
      setMensagem("Não foi possível conectar ao servidor.");
    } finally {
      setSalvando(false);
    }
  }

  async function salvarFiador() {
    if (salvando) return;

    if (
      !fiadorNome.trim() ||
      fiadorCpf.replace(/\D/g, "").length !== 11 ||
      !fiadorQualificacao.trim() ||
      !fiadorImovel.trim()
    ) {
      setErro(true);
      setMensagem(
        "Preencha todos os dados do fiador (nome, CPF com 11 dígitos, qualificação e imóvel) antes de salvar."
      );
      return;
    }

    setSalvando(true);
    setErro(false);
    setMensagem("");

    try {
      const token = sessionStorage.getItem("token");

      const resposta = await fetch(
        `${apiUrl}/contratos/${contratoId}/fiador`,
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
        setErro(true);
        setMensagem(
          Array.isArray(dados.message)
            ? dados.message.join(", ")
            : dados.message || "Erro ao salvar os dados do fiador."
        );
        return;
      }

      setFiadorSalvo(true);
      setMensagem("Dados do fiador salvos com sucesso!");
    } catch {
      setErro(true);
      setMensagem("Não foi possível conectar ao servidor.");
    } finally {
      setSalvando(false);
    }
  }

  async function concluirPreenchimento() {
    if (salvando) return;

    if (!fichaSalva) {
      setErro(true);
      setMensagem(
        "Salve sua ficha cadastral e documentos antes de concluir o envio."
      );
      return;
    }

    if (contrato?.garantia === "fiador" && !fiadorSalvo) {
      setErro(true);
      setMensagem("Salve os dados do fiador antes de concluir.");
      return;
    }

    const confirmar = window.confirm(
      "Você confirma que terminou de preencher seus dados e deseja enviar para análise cadastral do proprietário?"
    );

    if (!confirmar) return;

    setSalvando(true);
    setErro(false);
    setMensagem("");

    try {
      const token = sessionStorage.getItem("token");

      const resposta = await fetch(
        `${apiUrl}/contratos/${contratoId}/concluir-dados`,
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
            : dados.message || "Erro ao concluir o preenchimento."
        );
        return;
      }

      setContrato((anterior) => ({
        ...anterior,
        status: dados.status,
      }));

      setMensagem(
        "Dados enviados com sucesso! Seu cadastro está em análise pelo proprietário."
      );
    } catch {
      setErro(true);
      setMensagem("Não foi possível conectar ao servidor.");
    } finally {
      setSalvando(false);
    }
  }
useEffect(() => {
  if (!contrato) return;
  if (
    contrato.status !== "PENDENTE_DADOS" &&
    contrato.status !== "AGUARDANDO_REVISAO" &&
    contrato.status !== "AGUARDANDO_ASSINATURAS"
  ) {
    return;
  }

  const intervalo = setInterval(async () => {
    try {
      const token = sessionStorage.getItem("token");
      if (!token) return;
      const resp = await fetch(`${apiUrl}/contratos/${contratoId}/dados`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const dados = await resp.json();
        setContrato(dados);
      }
    } catch {}
  }, 5000);

  return () => clearInterval(intervalo);
}, [contrato, contratoId, apiUrl]);

async function baixarDocumentoContrato(endpoint, nomeArquivo) {
  try {
    const token = sessionStorage.getItem("token");
    const resp = await fetch(`${apiUrl}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!resp.ok) {
      setErro(true);
      setMensagem("Não foi possível abrir o arquivo.");
      return;
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nomeArquivo;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch {
    setErro(true);
    setMensagem("Erro ao baixar o arquivo.");
  }
}


  return (
    <main className="min-h-screen bg-linear-to-b from-ink from-60% to-ink-soft flex justify-center items-center p-6">
      <div className="bg-paper text-slate-darker rounded-xl p-7 w-full max-w-2xl shadow-lg">
        <div className="mb-4">
          <Link
            href="/dashboardInquilino"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-ink"
          >
            <ArrowLeft size={15} />
            Voltar para Dashboard
          </Link>
        </div>
        <h1 className="font-display text-2xl font-bold text-center">
          Ficha Cadastral e Dados do Contrato
        </h1>

        {carregando && (
          <p className="text-center mt-4">Carregando contrato...</p>
        )}

        {mensagem && (
          <p
            role={erro ? "alert" : "status"}
            className={`text-center mt-4 p-3 rounded-lg text-sm font-medium ${
              erro
                ? "bg-red-50 border border-red-200 text-red-600"
                : "bg-teal/10 border border-teal/30 text-teal"
            }`}
          >
            {mensagem}
          </p>
        )}

        {contrato && (
          <div className="mt-6 space-y-6 text-sm">
            <div className="flex justify-between items-center bg-slate-100 p-3 rounded-lg">
              <span>
                <strong>Contrato:</strong> nº {contrato.id}
              </span>
              <span>
                <strong>Status:</strong> {contrato.status}
              </span>
            </div>

           {contrato.status !== "PENDENTE_DADOS" ? (
  <div className="space-y-4">
    {contrato.status === "CANCELADO" && (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        O proprietário cancelou este contrato.
      </div>
    )}

    {contrato.status === "AGUARDANDO_REVISAO" && (
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 text-amber-900">
        <p className="font-bold">Ficha cadastral enviada para análise</p>
        <p className="mt-1">
          O proprietário está avaliando seus dados e documentos. Esta tela
          atualiza automaticamente assim que houver uma resposta.
        </p>
        <Link
          href="/dashboardInquilino"
          className="mt-4 inline-flex rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-ink hover:opacity-90"
        >
          Ir para o dashboard
        </Link>
      </div>
    )}

    {contrato.status === "CADASTRO_RECUSADO" && (
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
        <p className="font-bold">Cadastro recusado pelo proprietário</p>
        {contrato.justificativa_analise && (
          <p className="mt-1">
            <strong>Motivo:</strong> {contrato.justificativa_analise}
          </p>
        )}
      </div>
    )}

    {contrato.status === "AGUARDANDO_ASSINATURAS" && (
      <div className="rounded-xl border border-teal/30 bg-teal/10 p-5 space-y-3">
        <p className="font-bold text-teal text-base">
          ✓ Cadastro aprovado pelo proprietário!
        </p>
        {contrato.justificativa_analise && (
          <p className="text-xs text-slate-700">
            <strong>Parecer:</strong> {contrato.justificativa_analise}
          </p>
        )}
        <p className="text-sm text-slate-700">
          O contrato já foi aprovado e agora aguarda apenas o envio da via
          assinada pelo proprietário. Assim que ele anexar o documento, você
          poderá visualizá-lo aqui.
        </p>
        <button
          type="button"
          onClick={() =>
            baixarDocumentoContrato(
              `/contratos/${contratoId}/pdf`,
              `contrato-${contratoId}-aprovado.pdf`
            )
          }
          className="bg-ink text-white font-semibold px-4 py-2 rounded-lg text-xs"
        >
          Baixar cópia do contrato aprovado (PDF)
        </button>
      </div>
    )}

    {contrato.status === "CONCLUIDO" && (
      <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-5 space-y-4">
        <div>
          <p className="font-bold text-emerald-900 text-base">
            ✓ Contrato assinado enviado pelo proprietário!
          </p>
          <p className="text-xs text-emerald-800 mt-1">
            O proprietário anexou o contrato final assinado
            {contrato.data_assinatura_final
              ? ` em ${new Date(
                  contrato.data_assinatura_final
                ).toLocaleString("pt-BR", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}`
              : ""}
            . Seu contrato de locação está ativo.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            baixarDocumentoContrato(
              `/contratos/${contratoId}/contrato-assinado`,
              `contrato-${contratoId}-assinado.pdf`
            )
          }
          className="w-full bg-teal text-white font-bold rounded-lg p-3 hover:opacity-90"
        >
          Visualizar / Baixar Contrato Assinado
        </button>
      </div>
    )}
  </div>
) : (
              <>
                {/* SEÇÃO 1: Renda, Ocupação e Documentos (Issue #49) */}
                <section className="rounded-xl border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h2 className="font-bold text-lg">
                      1. Renda, Ocupação e Documentos
                    </h2>
                    {fichaSalva && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-teal">
                        <CheckCircle2 size={15} /> Salvo
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-semibold mb-1">
                        Renda Mensal Bruta (R$) *
                      </label>
                      <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={rendaMensal}
                        onChange={(e) => setRendaMensal(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2.5"
                        placeholder="Ex: 5500.00"
                      />
                    </div>

                    <div>
                      <label className="block font-semibold mb-1">
                        Ocupação / Cargo / Empresa *
                      </label>
                      <input
                        type="text"
                        value={ocupacao}
                        maxLength={150}
                        readOnly={Boolean(contrato.locatario?.profissao?.trim())}
                        onChange={(e) => setOcupacao(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2.5"
                        placeholder="Ex: Analista de Sistemas - Empresa X"
                      />
                      {contrato.locatario?.profissao?.trim() && (
                        <p className="mt-1 text-sm text-slate-600">
                          Usando a profissão do seu perfil. <Link href={`/perfil?contrato=${encodeURIComponent(contratoId)}`} className="underline">Editar perfil</Link>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <p className="font-semibold">
                      Documentos Comprobatórios (PDF, JPG ou PNG):
                    </p>

                    <div className="border border-dashed border-slate-300 rounded-lg p-3">
                      <label className="block font-medium mb-1">
                        Documento de Identidade (RG ou CNH)
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          setDocIdentidade(e.target.files?.[0] || null)
                        }
                        className="text-xs w-full"
                      />
                    </div>

                    <div className="border border-dashed border-slate-300 rounded-lg p-3">
                      <label className="block font-medium mb-1">
                        Comprovante de Renda (Holerite, Extrato ou IR)
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          setDocRenda(e.target.files?.[0] || null)
                        }
                        className="text-xs w-full"
                      />
                    </div>

                    <div className="border border-dashed border-slate-300 rounded-lg p-3">
                      <label className="block font-medium mb-1">
                        Comprovante de Residência Atual
                      </label>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) =>
                          setDocResidencia(e.target.files?.[0] || null)
                        }
                        className="text-xs w-full"
                      />
                    </div>

                    {contrato.documentos_locatario?.length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-3 space-y-1">
                        <p className="text-xs font-bold text-slate-600">
                          Documentos já anexados:
                        </p>
                        {contrato.documentos_locatario.map((doc, i) => (
                          <p
                            key={i}
                            className="text-xs text-teal flex items-center gap-1.5"
                          >
                            <FileCheck2 size={14} /> {doc.tipo}:{" "}
                            {doc.nome_original}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={salvarFichaCadastral}
                    disabled={salvando}
                    className="w-full inline-flex items-center justify-center gap-2 bg-ink text-white font-semibold rounded-lg p-3 disabled:opacity-50"
                  >
                    <Upload size={16} />
                    {salvando
                      ? "Enviando..."
                      : "Salvar Ficha Cadastral e Documentos"}
                  </button>
                </section>

                {/* SEÇÃO 2: Garantia Locatícia */}
                <section className="rounded-xl border border-slate-200 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h2 className="font-bold text-lg">
                      2. Garantia Locatícia ({contrato.garantia})
                    </h2>
                    {contrato.garantia === "fiador" && fiadorSalvo && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-teal">
                        <CheckCircle2 size={15} /> Salvo
                      </span>
                    )}
                  </div>

                  {contrato.garantia === "fiador" && (
                    <div className="space-y-3">
                      <div>
                        <label className="block mb-1 font-medium">
                          Nome completo do fiador
                        </label>
                        <input
                          type="text"
                          value={fiadorNome}
                          onChange={(e) => setFiadorNome(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg p-2.5"
                          placeholder="Nome do fiador"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 font-medium">
                          CPF do fiador
                        </label>
                        <input
                          type="text"
                          value={fiadorCpf}
                          onChange={(e) =>
                            setFiadorCpf(
                              e.target.value.replace(/\D/g, "").slice(0, 11)
                            )
                          }
                          className="w-full border border-slate-300 rounded-lg p-2.5"
                          placeholder="Somente números"
                          maxLength={11}
                        />
                      </div>

                      <div>
                        <label className="block mb-1 font-medium">
                          Qualificação do fiador
                        </label>
                        <textarea
                          value={fiadorQualificacao}
                          onChange={(e) =>
                            setFiadorQualificacao(e.target.value)
                          }
                          className="w-full border border-slate-300 rounded-lg p-2.5"
                          rows={2}
                          placeholder="Nacionalidade, estado civil, profissão, RG e endereço"
                        />
                      </div>

                      <div>
                        <label className="block mb-1 font-medium">
                          Informações do imóvel do fiador
                        </label>
                        <textarea
                          value={fiadorImovel}
                          onChange={(e) => setFiadorImovel(e.target.value)}
                          className="w-full border border-slate-300 rounded-lg p-2.5"
                          rows={2}
                          placeholder="Matrícula, cartório de registro e cidade/UF"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={salvarFiador}
                        disabled={salvando}
                        className="w-full bg-ink text-white font-semibold rounded-lg p-3 disabled:opacity-50"
                      >
                        {salvando ? "Salvando..." : "Salvar dados do fiador"}
                      </button>
                    </div>
                  )}

                  {contrato.garantia === "caucao" && (
                    <p>
                      Modalidade Caução — Valor acordado:{" "}
                      <strong>
                        R$ {Number(contrato.valor_caucao || 0).toFixed(2)}
                      </strong>
                    </p>
                  )}

                  {contrato.garantia === "seguro" && (
                    <p>
                      Modalidade Seguro-fiança — O proprietário informará os
                      dados da seguradora e apólice.
                    </p>
                  )}

                  {contrato.garantia === "nenhuma" && (
                    <p>Este contrato não exige garantia adicional.</p>
                  )}
                </section>

                {/* BOTÃO FINAL */}
                <button
                  type="button"
                  onClick={concluirPreenchimento}
                  disabled={salvando}
                  className="w-full bg-teal text-white font-bold rounded-lg p-3.5 text-base disabled:opacity-50 hover:opacity-90"
                >
                  {salvando
                    ? "Aguarde..."
                    : "Concluir e Enviar para Análise Cadastral"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function CompletarContrato() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ink" />}>
      <ConteudoCompletarContrato />
    </Suspense>
  );
}
