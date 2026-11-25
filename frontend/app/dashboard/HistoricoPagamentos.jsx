"use client";

import { useEffect, useState } from "react";
import { CalendarDays, RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const formatoMes = new Intl.DateTimeFormat("pt-BR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const repasses = {
  AGUARDANDO: ["Aguardando repasse", "amber"],
  AGUARDANDO_DESTINO: ["Dados bancários pendentes", "amber"],
  AGUARDANDO_SALDO: ["Aguardando saldo", "amber"],
  PROCESSANDO: ["Processando repasse", "blue"],
  PROCESSANDO_BANCO: ["Processando no banco", "blue"],
  CONCLUIDO: ["Repassado", "green"],
  FALHA: ["Falha no repasse", "red"],
  BLOQUEADO: ["Bloqueado", "red"],
  CANCELADO: ["Repasse cancelado", "gray"],
  VERIFICAR: ["Em verificação", "amber"],
};

const cores = {
  amber: "bg-amber-400/10 text-amber-200",
  blue: "bg-sky-400/10 text-sky-200",
  green: "bg-emerald-400/10 text-emerald-200",
  red: "bg-rose-400/10 text-rose-200",
  gray: "bg-slate-400/10 text-slate-300",
};

function referenciaMes(mes) {
  return formatoMes.format(new Date(`${mes}-01T00:00:00Z`));
}

function situacaoFatura({ pago, status_fatura }) {
  if (pago) return ["Pago", "green"];
  if (status_fatura === "VENCIDO") return ["Em atraso", "red"];
  if (status_fatura === "CANCELADO") return ["Cancelado", "gray"];
  return ["Pendente", "amber"];
}

function Situacao({ estado }) {
  const [rotulo, cor] = estado;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${cores[cor]}`}>
      {rotulo}
    </span>
  );
}

export default function HistoricoPagamentos({ apiUrl }) {
  const router = useRouter();
  const [pagamentos, setPagamentos] = useState([]);
  const [mes, setMes] = useState("");
  const [atualizacao, setAtualizacao] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [tentandoRepasse, setTentandoRepasse] = useState(null);
  const [retornoRepasse, setRetornoRepasse] = useState(null);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    const requisicao = new AbortController();
    setCarregando(true);
    setErro("");

    async function carregarHistorico() {
      try {
        const resposta = await fetch(`${apiUrl}/contratos/historico-pagamentos`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
          signal: requisicao.signal,
        });

        if (requisicao.signal.aborted) return;
        if (resposta.status === 401) {
          sessionStorage.removeItem("token");
          router.replace("/login");
          return;
        }
        if (!resposta.ok) throw new Error("Não foi possível carregar os pagamentos.");

        const dados = await resposta.json();
        if (!requisicao.signal.aborted) setPagamentos(dados);
      } catch {
        if (!requisicao.signal.aborted) setErro("Não foi possível carregar os pagamentos.");
      } finally {
        if (!requisicao.signal.aborted) setCarregando(false);
      }
    }

    carregarHistorico();
    return () => requisicao.abort();
  }, [apiUrl, atualizacao, router]);

  async function tentarRepasse(faturaId) {
    if (tentandoRepasse !== null) return;

    const token = sessionStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    setTentandoRepasse(faturaId);
    setRetornoRepasse(null);
    try {
      const resposta = await fetch(
        `${apiUrl}/contratos/historico-pagamentos/${encodeURIComponent(faturaId)}/tentar-repasse`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      if (resposta.status === 401) {
        sessionStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        throw new Error(dados.message || "Não foi possível agendar o repasse.");
      }

      setRetornoRepasse({ mensagem: dados.mensagem, erro: false });
      setAtualizacao((atual) => atual + 1);
    } catch (falha) {
      setRetornoRepasse({ mensagem: falha.message, erro: true });
    } finally {
      setTentandoRepasse(null);
    }
  }

  const meses = [...new Set(pagamentos.map(({ vencimento }) => vencimento.slice(0, 7)))];
  const visiveis = mes ? pagamentos.filter(({ vencimento }) => vencimento.startsWith(mes)) : pagamentos;

  return (
    <section className="section-box" aria-labelledby="historico-pagamentos-titulo">
      <header className="section-header">
        <div className="section-title-group">
          <h2 className="section-title" id="historico-pagamentos-titulo">Histórico de pagamentos</h2>
          <p className="section-subtitle">Acompanhe as cobranças e os repasses dos seus imóveis.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-xs text-slate-300">
            Mês de referência
            <select
              value={mes}
              onChange={(evento) => setMes(evento.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Todos os meses</option>
              {meses.map((periodo) => <option key={periodo} value={periodo}>{referenciaMes(periodo)}</option>)}
            </select>
          </label>
          <button
            type="button"
            className="btn-refresh"
            aria-label="Atualizar histórico"
            title="Atualizar histórico"
            disabled={carregando}
            onClick={() => setAtualizacao((atual) => atual + 1)}
          >
            <RefreshCw size={17} aria-hidden="true" />
          </button>
        </div>
      </header>

      {retornoRepasse && (
        <p
          role={retornoRepasse.erro ? "alert" : "status"}
          className={`px-6 py-3 text-sm ${retornoRepasse.erro ? "text-rose-300" : "text-emerald-200"}`}
        >
          {retornoRepasse.mensagem}
        </p>
      )}

      {carregando ? (
        <p className="p-6 text-sm text-slate-300" role="status">Carregando histórico...</p>
      ) : erro ? (
        <p className="p-6 text-sm text-rose-300" role="alert">{erro}</p>
      ) : visiveis.length === 0 ? (
        <div className="flex items-center gap-3 p-6 text-sm text-slate-300">
          <CalendarDays size={20} aria-hidden="true" />
          {mes ? "Nenhuma cobrança neste mês." : "Nenhuma cobrança registrada para seus imóveis."}
        </div>
      ) : (
        <div className="table-responsive">
          <table className="data-table">
            <thead className="table-head">
              <tr>
                <th scope="col" className="table-th">Mês de referência</th>
                <th scope="col" className="table-th">Imóvel</th>
                <th scope="col" className="table-th">Inquilino</th>
                <th scope="col" className="table-th">Valor</th>
                <th scope="col" className="table-th">Pagamento</th>
                <th scope="col" className="table-th">Repasse</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map((pagamento) => (
                <tr className="table-row" key={pagamento.id}>
                  <td className="table-td">
                    <p className="address-primary capitalize">{referenciaMes(pagamento.vencimento.slice(0, 7))}</p>
                    <p className="address-secondary">Vence em {pagamento.vencimento.split("-").reverse().join("/")}</p>
                  </td>
                  <td className="table-td">
                    <p className="address-primary">{pagamento.logradouro}, {pagamento.numero}</p>
                    <p className="address-secondary">{pagamento.cidade}</p>
                  </td>
                  <td className="table-td">{pagamento.inquilino}</td>
                  <td className="table-td whitespace-nowrap">{moeda.format(Number(pagamento.valor))}</td>
                  <td className="table-td"><Situacao estado={situacaoFatura(pagamento)} /></td>
                  <td className="table-td">
                    <Situacao estado={repasses[pagamento.status_repasse] ??
                      (pagamento.pago ? repasses.AGUARDANDO : ["Aguardando pagamento", "gray"])} />
                    {pagamento.pode_tentar_repasse === true && (
                      <button
                        type="button"
                        disabled={tentandoRepasse !== null}
                        onClick={() => tentarRepasse(pagamento.id)}
                        className="mt-2 flex w-fit items-center gap-2 rounded-lg border border-teal-300/30 px-3 py-2 text-left text-xs font-semibold text-teal-200 transition-colors hover:bg-teal-300/10 disabled:opacity-50"
                      >
                        <RefreshCw size={14} className="shrink-0" aria-hidden="true" />
                        {tentandoRepasse === pagamento.id ? "Agendando..." : "Tentar repasse novamente"}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
