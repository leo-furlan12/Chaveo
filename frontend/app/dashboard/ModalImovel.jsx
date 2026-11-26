"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Building2, MapPin, X } from "lucide-react";

const situacoes = {
  RASCUNHO: "Rascunho",
  AGUARDANDO_INQUILINO: "Aguardando aceite do convite",
  PENDENTE_DADOS: "Aguardando dados do inquilino",
  AGUARDANDO_REVISAO: "Em análise cadastral",
  AGUARDANDO_ASSINATURAS: "Aguardando assinaturas",
  CADASTRO_RECUSADO: "Cadastro recusado",
  CANCELADO: "Cancelado",
  CONCLUIDO: "Concluído",
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatarData(data) {
  return data ? data.split("-").reverse().join("/") : "Não informada";
}

function Campo({ titulo, valor }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-slate-400">{titulo}</dt>
      <dd className="mt-1 break-words text-sm text-slate-100">{valor || "Não informado"}</dd>
    </div>
  );
}

export default function ModalImovel({ apiUrl, imovel, onFechar }) {
  const modal = useRef(null);
  const router = useRouter();
  const [contratos, setContratos] = useState([]);
  const [situacao, setSituacao] = useState("");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    const dialogo = modal.current;
    if (!dialogo.open) dialogo.showModal();
  }, []);

  useEffect(() => {
    const requisicao = new AbortController();

    async function carregarHistorico() {
      const token = sessionStorage.getItem("token");

      if (!token) {
        router.replace("/login");
        return;
      }

      try {
        const resposta = await fetch(
          `${apiUrl.replace(/\/$/, "")}/contratos/imovel/${encodeURIComponent(imovel.id)}/historico`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
            signal: requisicao.signal,
          },
        );

        if (resposta.status === 401) {
          sessionStorage.removeItem("token");
          router.replace("/login");
          return;
        }

        const dados = await resposta.json();
        if (!resposta.ok) {
          throw new Error(dados.message || "Não foi possível carregar o histórico.");
        }

        if (!requisicao.signal.aborted) setContratos(dados);
      } catch (falha) {
        if (!requisicao.signal.aborted) {
          setErro(falha.message || "Não foi possível carregar o histórico.");
        }
      } finally {
        if (!requisicao.signal.aborted) setCarregando(false);
      }
    }

    carregarHistorico();
    return () => requisicao.abort();
  }, [apiUrl, imovel.id, router]);

  const opcoes = [...new Set(contratos.map((contrato) => contrato.status))];
  const contratosVisiveis = situacao
    ? contratos.filter((contrato) => contrato.status === situacao)
    : contratos;

  return (
    <dialog
      ref={modal}
      onClose={onFechar}
      aria-labelledby="modal-imovel-titulo"
      className="m-auto max-h-[88vh] w-[calc(100%_-_2rem)] max-w-3xl overflow-y-auto rounded-2xl border border-slate-700 bg-[#191e28] text-slate-100 backdrop:bg-black/65"
    >
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-teal-300/20 bg-[#203136] px-5 py-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-300/10 text-teal-200">
            <Building2 size={23} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-medium text-teal-200">Imóvel #{imovel.id}</p>
            <h2 id="modal-imovel-titulo" className="mt-1 break-words text-xl font-semibold">
              {imovel.logradouro}, {imovel.numero}
            </h2>
          </div>
        </div>
        <button
          type="button"
          aria-label="Fechar detalhes do imóvel"
          onClick={() => modal.current.close()}
          className="rounded-lg p-2 text-slate-300 hover:bg-slate-700"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <div className="space-y-6 p-5 sm:p-6">
        <section className="overflow-hidden rounded-xl border border-slate-700 bg-slate-800/40" aria-labelledby="dados-imovel-titulo">
          <h3 id="dados-imovel-titulo" className="flex items-center gap-2 border-b border-slate-700 px-4 py-3 font-semibold">
            <MapPin size={17} className="text-teal-300" aria-hidden="true" />
            Dados do imóvel
          </h3>
          <dl className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 [&>div]:rounded-lg [&>div]:bg-[#191e28] [&>div]:p-3">
            <Campo titulo="Tipo" valor={imovel.tipo || imovel.tipo_imovel} />
            <Campo titulo="Situação do imóvel" valor={imovel.status} />
            <Campo titulo="CEP" valor={imovel.cep} />
            <Campo titulo="Bairro" valor={imovel.bairro} />
            <Campo titulo="Cidade / UF" valor={[imovel.cidade, imovel.estado].filter(Boolean).join(" / ")} />
            <Campo titulo="Complemento" valor={imovel.complemento} />
          </dl>
        </section>

        <section aria-labelledby="historico-imovel-titulo">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h3 id="historico-imovel-titulo" className="font-semibold">Histórico de contratos</h3>
            {opcoes.length > 0 && (
              <label className="grid gap-1 text-xs text-slate-300">
                Situação do contrato
                <select
                  value={situacao}
                  onChange={(evento) => setSituacao(evento.target.value)}
                  className="max-w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-100"
                >
                  <option value="">Todas as situações</option>
                  {opcoes.map((codigo) => (
                    <option key={codigo} value={codigo}>{situacoes[codigo] || codigo}</option>
                  ))}
                </select>
              </label>
            )}
          </div>

          {carregando && <p role="status" className="text-sm text-slate-300">Carregando contratos...</p>}
          {erro && <p role="alert" className="text-sm text-red-300">{erro}</p>}
          {!carregando && !erro && contratosVisiveis.length === 0 && (
            <p className="text-sm text-slate-300">Nenhum contrato encontrado para este imóvel.</p>
          )}

          <div className="grid gap-3">
            {contratosVisiveis.map((contrato) => (
              <article key={contrato.id} className="space-y-4 rounded-xl border border-slate-700 bg-slate-800/50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="font-medium">Contrato #{contrato.id}</h4>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${contrato.status === "CANCELADO"
                    ? "bg-rose-400/10 text-rose-200"
                    : "bg-teal-300/10 text-teal-200"}`}>
                    {situacoes[contrato.status] || contrato.status}
                  </span>
                </div>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <Campo titulo="Início" valor={formatarData(contrato.data_inicio)} />
                  <Campo titulo="Término" valor={formatarData(contrato.data_fim)} />
                  <Campo
                    titulo="Aluguel mensal"
                    valor={contrato.valor_aluguel != null ? moeda.format(Number(contrato.valor_aluguel)) : null}
                  />
                </dl>

                <div className="border-t border-slate-700 pt-3">
                  <h5 className="mb-2 text-sm font-medium">Inquilino</h5>
                  {contrato.inquilino ? (
                    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Campo titulo="Nome" valor={contrato.inquilino.nome} />
                      <Campo titulo="CPF" valor={contrato.inquilino.cpf} />
                      <Campo titulo="Telefone" valor={contrato.inquilino.telefone} />
                    </dl>
                  ) : (
                    <>
                      <p className="mb-2 text-sm text-slate-300">Nenhum inquilino vinculado.</p>
                      {contrato.cpf_convidado && (
                        <dl><Campo titulo="CPF convidado" valor={contrato.cpf_convidado} /></dl>
                      )}
                    </>
                  )}
                </div>
                {contrato.status !== "CANCELADO" && (
                  <div className="flex flex-wrap justify-end border-t border-slate-700 pt-3">
                    <Link
                      href={`/DetalhesContrato?id=${encodeURIComponent(contrato.id)}`}
                      className="inline-flex items-center gap-2 rounded-lg border border-teal-300/30 bg-teal-300/10 px-3 py-2 text-sm font-semibold text-teal-100 hover:bg-teal-300/20"
                    >
                      Detalhes do contrato
                      <ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>
      </div>
    </dialog>
  );
}
