"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Bell, Mail, Receipt } from "lucide-react";
import "../style.css";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const calendarioLocal = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function formatarData(data) {
  const dia = data.includes("T") ? calendarioLocal.format(new Date(data)) : data;
  return dia.split("-").reverse().join("/");
}

function situacaoBoleto(boleto) {
  if (boleto.status === "CANCELADO") return { texto: "Cancelado", cor: "bg-slate-400/10 text-slate-300" };
  if (boleto.pago) return { texto: "Pago", cor: "bg-emerald-400/10 text-emerald-300" };

  const hoje = calendarioLocal.format(new Date());
  const dias = (Date.parse(boleto.data_vencimento) - Date.parse(hoje)) / 86400000;

  if (boleto.status === "VENCIDO" || dias < 0) return { texto: "Em atraso", cor: "bg-rose-400/10 text-rose-300" };
  if (dias <= 7) {
    const unidade = dias === 0 ? "hoje" : dias === 1 ? "amanhã" : `em ${dias} dias`;
    return { texto: `Vence ${unidade}`, cor: "bg-amber-400/10 text-amber-200" };
  }

  return { texto: "Boleto gerado", cor: "bg-cyan-400/10 text-cyan-200" };
}

const filtros = [
  { id: "todas", titulo: "Todas", icone: Bell },
  { id: "convites", titulo: "Convites", icone: Mail },
  { id: "pagamentos", titulo: "Pagamentos", icone: Receipt },
];

export default function MinhasNotificacoesPage() {
  const router = useRouter();
  const [{ convites, boletos }, setNotificacoes] = useState({ convites: [], boletos: [] });
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("todas");

  useEffect(() => {
    async function carregarNotificacoes() {
      const token = sessionStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return;
      }

      setCarregando(true);
      setErro("");

      try {
        const resposta = await fetch(`${apiBaseUrl}/contratos/minhas-notificacoes`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (resposta.status === 401) {
          sessionStorage.removeItem("token");
          router.replace("/login");
          return;
        }

        if (!resposta.ok) {
          throw new Error("Não foi possível carregar suas notificações.");
        }

        setNotificacoes(await resposta.json());
      } catch {
        setErro("Não foi possível carregar suas notificações.");
      } finally {
        setCarregando(false);
      }
    }

    carregarNotificacoes();
  }, [router]);

  const mostrarConvites = filtro !== "pagamentos";
  const mostrarPagamentos = filtro !== "convites";
  const totalPorFiltro = {
    todas: convites.length + boletos.length,
    convites: convites.length,
    pagamentos: boletos.length,
  };
  const classeCartao = "flex flex-wrap items-start gap-4 rounded-xl border border-slate-700/70 bg-[#191e28] p-4 sm:p-5";

  return (
    <div className="tenant-dashboard">
      <main className="tenant-main">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8 sm:py-12">
          <Link
            className="mb-6 inline-flex items-center gap-2 text-sm text-slate-300 hover:text-teal-200"
            href="/dashboardInquilino"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Voltar ao dashboard
          </Link>

          <header className="flex items-center gap-4 rounded-2xl border border-teal-300/20 bg-linear-to-br from-[#20383b] to-[#191e28] p-5 sm:p-7">
            <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-teal-300/10 text-teal-200">
              <Bell size={23} aria-hidden="true" />
            </span>
            <h1 className="text-2xl font-bold text-white sm:text-3xl">Minhas notificações</h1>
          </header>

          <div className="my-6 flex flex-wrap gap-2" role="group" aria-label="Filtrar notificações">
            {filtros.map(({ id, titulo, icone: Icone }) => (
              <button
                key={id}
                type="button"
                aria-pressed={filtro === id}
                onClick={() => setFiltro(id)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300 ${filtro === id
                  ? "border-teal-300/40 bg-teal-300/15 text-teal-100"
                  : "border-slate-700 bg-[#191e28] text-slate-300 hover:border-slate-500"}`}
              >
                <Icone size={16} aria-hidden="true" />
                {titulo}
                {!carregando && !erro && <span className="text-xs opacity-80">{totalPorFiltro[id]}</span>}
              </button>
            ))}
          </div>

          {carregando ? (
            <p role="status" className={classeCartao}>Carregando notificações...</p>
          ) : erro ? (
            <p className="tenant-alert" role="alert">{erro}</p>
          ) : (
            <div className="space-y-8">
              {mostrarConvites && (
                <section aria-labelledby="convites-titulo">
                  <h2 className="mb-3 text-lg font-semibold" id="convites-titulo">Convites</h2>
                  {convites.length === 0 ? (
                    <p className={classeCartao}>Você ainda não recebeu convites.</p>
                  ) : (
                    <div className="grid gap-3">
                      {convites.map((convite) => {
                        const pendente = convite.status === "PENDENTE";
                        const imovel = convite.imovel;
                        const destino = pendente
                          ? `/ConviteContrato?token=${encodeURIComponent(convite.convite_token)}`
                          : `/CompletarContrato?id=${encodeURIComponent(convite.contrato_id)}`;

                        return (
                          <article className={classeCartao} key={convite.contrato_id}>
                            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-teal-300/10 text-teal-200">
                              <Mail size={18} aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1 basis-40">
                              <p className="mb-2 text-xs font-semibold text-teal-200">
                                {pendente ? "Convite pendente" : "Convite aceito"}
                              </p>
                              <h3 className="font-semibold text-white">
                                {imovel ? `${imovel.logradouro}, ${imovel.numero}` : "Imóvel do contrato"}
                              </h3>
                              {imovel?.cidade && <p className="mt-1 text-sm text-slate-300">{imovel.cidade}</p>}
                            </div>
                            <Link className="inline-flex items-center gap-2 rounded-lg border border-teal-300/30 px-3 py-2 text-sm text-teal-100 hover:bg-teal-300/10" href={destino}>
                              {pendente ? "Abrir convite" : "Ver contrato"}
                              <ArrowUpRight size={15} aria-hidden="true" />
                            </Link>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {mostrarPagamentos && (
                <section aria-labelledby="pagamentos-titulo">
                  <h2 className="mb-3 text-lg font-semibold" id="pagamentos-titulo">Pagamentos</h2>
                  {boletos.length === 0 ? (
                    <p className={classeCartao}>Você ainda não tem boletos registrados.</p>
                  ) : (
                    <div className="grid gap-3">
                      {boletos.map((boleto) => {
                        const situacao = situacaoBoleto(boleto);

                        return (
                          <article className={classeCartao} key={boleto.id}>
                            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-slate-500/15 text-slate-200">
                              <Receipt size={18} aria-hidden="true" />
                            </span>
                            <div className="min-w-0 flex-1 basis-44">
                              <p className={`mb-2 inline-flex rounded-md px-2 py-1 text-xs font-semibold ${situacao.cor}`}>{situacao.texto}</p>
                              <h3 className="font-semibold text-white">
                                {boleto.imovel ? `${boleto.imovel.logradouro}, ${boleto.imovel.numero}` : "Boleto de aluguel"}
                              </h3>
                              <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs">
                                <div>
                                  <dt className="text-slate-400">Registrado em</dt>
                                  <dd>{formatarData(boleto.registrado_em)}</dd>
                                </div>
                                <div>
                                  <dt className="text-slate-400">Vencimento</dt>
                                  <dd>{formatarData(boleto.data_vencimento)}</dd>
                                </div>
                                {boleto.pago && boleto.data_pagamento && (
                                  <div>
                                    <dt className="text-slate-400">Pagamento</dt>
                                    <dd>{formatarData(boleto.data_pagamento)}</dd>
                                  </div>
                                )}
                              </dl>
                            </div>
                            <p className="font-semibold tabular-nums text-white">{moeda.format(Number(boleto.valor))}</p>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
