"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Bell,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Mail,
  RefreshCw,
  XCircle,
} from "lucide-react";

const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api"
).replace(/\/$/, "");

function formatarData(data) {
  if (!data) return "-";
  const dia = String(data).slice(0, 10);
  const [ano, mes, d] = dia.split("-");
  if (!ano || !mes || !d) return data;
  return `${d}/${mes}/${ano}`;
}

function estiloStatusContrato(item) {
  if (item.tipo === "ENCERRADO" || item.tipo === "RECUSADO") {
    return "bg-red-100 text-red-700 border-red-200";
  }
  if (item.tipo === "PERTO_DO_FIM" || item.status === "AGUARDANDO_REVISAO") {
    return "bg-amber-100 text-amber-800 border-amber-200";
  }
  if (item.tipo === "CANCELADO") {
    return "bg-slate-200 text-slate-700 border-slate-300";
  }
  if (item.status === "CONCLUIDO") {
    return "bg-emerald-100 text-emerald-800 border-emerald-200";
  }
  return "bg-teal/10 text-teal border-teal/30";
}

function infoConviteProprietario(convite) {
  if (convite.status === "RESPONDIDO") {
    return {
      texto: "Convite respondido",
      cor: "bg-emerald-100 text-emerald-800 border-emerald-200",
    };
  }
  if (convite.status === "CANCELADO") {
    return {
      texto: "Convite cancelado",
      cor: "bg-slate-200 text-slate-700 border-slate-300",
    };
  }
  return {
    texto: "Aguardando resposta do inquilino",
    cor: "bg-amber-100 text-amber-800 border-amber-200",
  };
}

const FILTROS = [
  { id: "todas", titulo: "Todas", icone: Bell },
  { id: "contratos", titulo: "Contratos", icone: FileText },
  { id: "convites", titulo: "Convites", icone: Mail },
];

export default function NotificacoesProprietarioPage() {
  const router = useRouter();
  const [contratos, setContratos] = useState([]);
  const [convites, setConvites] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [filtro, setFiltro] = useState("todas");

  useEffect(() => {
    async function carregar() {
      const token = sessionStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return;
      }

      setCarregando(true);
      setErro("");

      try {
        const resposta = await fetch(`${apiUrl}/contratos/minhas-notificacoes`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (resposta.status === 401) {
          sessionStorage.removeItem("token");
          router.replace("/login");
          return;
        }

        if (!resposta.ok) {
          throw new Error("Não foi possível carregar as notificações.");
        }

        const dados = await resposta.json();

        setContratos(
          (dados.contratos || []).filter((item) => item.papel === "PROPRIETARIO"),
        );
        setConvites(
          (dados.convites || []).filter((item) => item.papel === "PROPRIETARIO"),
        );
      } catch (e) {
        setErro(e.message || "Não foi possível carregar as notificações.");
      } finally {
        setCarregando(false);
      }
    }

    carregar();
  }, [router]);

  const mostrarContratos = filtro === "todas" || filtro === "contratos";
  const mostrarConvites = filtro === "todas" || filtro === "convites";

  const totalPorFiltro = {
    todas: contratos.length + convites.length,
    contratos: contratos.length,
    convites: convites.length,
  };

  return (
    <main className="min-h-screen bg-linear-to-b from-ink from-60% to-ink-soft p-6">
      <div className="max-w-4xl mx-auto bg-paper text-slate-darker rounded-xl p-7 shadow-lg">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700"
              title="Voltar ao dashboard"
            >
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="font-display text-2xl font-bold flex items-center gap-2">
                <Bell size={22} className="text-teal" />
                Notificações do Proprietário
              </h1>
              <p className="text-xs text-slate-500">
                Acompanhe convites respondidos, análises cadastrais e prazos de renovação
              </p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 mb-6" role="group" aria-label="Filtrar notificações">
          {FILTROS.map(({ id, titulo, icone: Icone }) => (
            <button
              key={id}
              type="button"
              onClick={() => setFiltro(id)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold border transition ${
                filtro === id
                  ? "bg-teal text-white border-teal"
                  : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
              }`}
            >
              <Icone size={16} />
              {titulo}
              {!carregando && !erro && (
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full ${
                    filtro === id ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {totalPorFiltro[id]}
                </span>
              )}
            </button>
          ))}
        </div>

        {carregando ? (
          <p className="text-center py-8 text-slate-600">Carregando notificações...</p>
        ) : erro ? (
          <p
            role="alert"
            className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm font-medium text-red-600"
          >
            {erro}
          </p>
        ) : (
          <div className="space-y-8">
            {/* Seção de Contratos */}
            {mostrarContratos && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold">Contratos e Prazos</h2>

                {contratos.length === 0 ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Nenhuma atualização de contrato no momento.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {contratos.map((item) => {
                      const imovel = item.imovel;
                      const destino =
                        item.status === "AGUARDANDO_REVISAO"
                          ? `/AnaliseCadastral?id=${encodeURIComponent(item.contrato_id)}`
                          : imovel?.id
                            ? `/DetalhesContrato?imovelId=${encodeURIComponent(imovel.id)}`
                            : "/dashboard";

                      return (
                        <article
                          key={`contrato-${item.contrato_id}`}
                          className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-[240px]">
                            <span
                              className={`mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg ${
                                item.perto_do_fim
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-teal/10 text-teal"
                              }`}
                            >
                              {item.perto_do_fim ? (
                                <CalendarClock size={19} />
                              ) : (
                                <FileText size={19} />
                              )}
                            </span>

                            <div className="space-y-1.5 flex-1">
                              <span
                                className={`inline-block rounded-md border px-2.5 py-0.5 text-xs font-bold ${estiloStatusContrato(item)}`}
                              >
                                {item.titulo}
                              </span>

                              <h3 className="font-bold text-base">
                                {imovel
                                  ? `${imovel.logradouro}, ${imovel.numero}${imovel.cidade ? ` - ${imovel.cidade}` : ""}`
                                  : `Contrato #${item.contrato_id}`}
                              </h3>

                              <p className="text-sm text-slate-600">{item.descricao}</p>

                              {item.data_fim && (
                                <p className="text-xs text-slate-500">
                                  Vigência: {formatarData(item.data_inicio)} até{" "}
                                  <strong className="text-slate-700">
                                    {formatarData(item.data_fim)}
                                  </strong>
                                </p>
                              )}

                              {/* Bloco de renovação quando o contrato está perto do fim */}
                              {item.perto_do_fim && (
                                <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/70 p-3">
                                  <p className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                                    <RefreshCw size={14} />
                                    Situação da renovação
                                  </p>

                                  {item.interesse_renovacao === "SIM" ? (
                                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                                      <CheckCircle2 size={14} />
                                      O inquilino informou que deseja renovar o contrato.
                                    </p>
                                  ) : item.interesse_renovacao === "NAO" ? (
                                    <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-red-700">
                                      <XCircle size={14} />
                                      O inquilino informou que não pretende renovar.
                                    </p>
                                  ) : (
                                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-600">
                                      <Clock size={14} />
                                      Aguardando o inquilino responder se deseja renovar.
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          <Link
                            href={destino}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3.5 py-2 text-xs font-bold text-white hover:opacity-90 shrink-0"
                          >
                            {item.status === "AGUARDANDO_REVISAO"
                              ? "Revisar cadastro"
                              : "Ver contrato"}
                            <ArrowUpRight size={15} />
                          </Link>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            )}

            {/* Seção de Convites */}
            {mostrarConvites && (
              <section className="space-y-3">
                <h2 className="text-lg font-bold">Convites Enviados</h2>

                {convites.length === 0 ? (
                  <p className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                    Você ainda não enviou convites de locação.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {convites.map((convite) => {
                      const info = infoConviteProprietario(convite);
                      const imovel = convite.imovel;
                      const destino = imovel?.id
                        ? `/DetalhesContrato?imovelId=${encodeURIComponent(imovel.id)}`
                        : "/dashboard";

                      return (
                        <article
                          key={`convite-${convite.contrato_id}`}
                          className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4"
                        >
                          <div className="flex items-start gap-3 flex-1 min-w-[240px]">
                            <span className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-lg bg-teal/10 text-teal">
                              <Mail size={19} />
                            </span>

                            <div className="space-y-1">
                              <span
                                className={`inline-block rounded-md border px-2.5 py-0.5 text-xs font-bold ${info.cor}`}
                              >
                                {info.texto}
                              </span>

                              <h3 className="font-bold text-base">
                                {imovel
                                  ? `${imovel.logradouro}, ${imovel.numero}`
                                  : `Contrato #${convite.contrato_id}`}
                              </h3>

                              {imovel?.cidade && (
                                <p className="text-xs text-slate-500">{imovel.cidade}</p>
                              )}

                              {convite.status === "RESPONDIDO" && convite.inquilino_nome && (
                                <p className="text-xs text-slate-700 pt-0.5">
                                  Aceito por <strong>{convite.inquilino_nome}</strong>
                                </p>
                              )}
                            </div>
                          </div>

                          <Link
                            href={destino}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 shrink-0"
                          >
                            Ver contrato
                            <ArrowUpRight size={15} />
                          </Link>
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
  );
}