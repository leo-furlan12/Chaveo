"use client";

import TrocarPerfil, { BotaoPerfil } from "../components/TrocarPerfil";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Copy,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FileCheck2,
  FileText,
  KeyRound,
  LogOut,
  Bell,
  MapPin,
  Printer,
  RefreshCw,
  QrCode,
  Wallet,
} from "lucide-react";
import "./style.css";

const apiBaseUrl =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

function formatarMoeda(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return "Não informado";
  }

  return Number(valor).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data) {
  if (!data) return "Não informado";

  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

function normalizarStatus(status) {
  const statusNormalizado = status?.toUpperCase();

  if (statusNormalizado === "ATIVO") {
    return { texto: "Contrato ativo", classe: "status-ativo" };
  }

  if (statusNormalizado === "AGUARDANDO_REVISAO") {
    return { texto: "Aguardando revisão", classe: "status-pendente" };
  }

  return {
    texto: status
      ? status
          .toLowerCase()
          .replaceAll("_", " ")
          .replace(/^\w/, (letra) => letra.toUpperCase())
      : "Status não informado",
    classe: "status-pendente",
  };
}

// Apresenta o estado financeiro da fatura em português e seleciona a cor do selo.
function normalizarStatusFatura(status) {
  const statusNormalizado = status?.toUpperCase();

  if (
    ["PAGO", "CONFIRMADO", "RECEBIDO", "CONFIRMED", "RECEIVED"].includes(
      statusNormalizado,
    )
  ) {
    return { texto: "Pago", classe: "invoice-status-paid" };
  }

  if (["VENCIDO", "OVERDUE"].includes(statusNormalizado)) {
    return { texto: "Atrasado", classe: "invoice-status-overdue" };
  }

  if (
    ["CANCELADO", "CANCELLED", "CANCELED", "DELETED"].includes(
      statusNormalizado,
    )
  ) {
    return { texto: "Cancelado", classe: "invoice-status-cancelled" };
  }

  return { texto: "Pendente", classe: "invoice-status-pending" };
}

// Identifica cancelamentos tanto no status local quanto nos nomes usados pelo Asaas.
function faturaEstaCancelada(fatura) {
  return ["CANCELADO", "CANCELLED", "CANCELED", "DELETED"].includes(
    fatura?.status?.toUpperCase(),
  );
}

// Só apresenta ações de pagamento para faturas que ainda não foram pagas nem canceladas.
function faturaEstaEmAberto(fatura) {
  return Boolean(fatura && !fatura.pago && !faturaEstaCancelada(fatura));
}

// Aceita tanto o Base64 puro retornado pelo Asaas quanto uma data URL completa.
function obterFonteImagemPix(imagemBase64) {
  if (imagemBase64?.startsWith("data:image/")) return imagemBase64;
  return `data:image/png;base64,${imagemBase64}`;
}

// Abre o recibo oficial do Asaas ou monta uma versão imprimível identificada pelo Chaveo.
function imprimirComprovantePagamento(fatura, contrato, usuario) {
  if (!fatura?.pago) return;

  if (fatura.comprovante_url) {
    window.open(fatura.comprovante_url, "_blank", "noopener,noreferrer");
    return;
  }

  const escaparHtml = (valor) =>
    String(valor ?? "").replace(
      /[&<>\"']/g,
      (caractere) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[caractere],
    );
  const janelaImpressao = window.open("", "_blank", "width=800,height=700");

  if (!janelaImpressao) {
    window.alert("Permita a abertura de janelas para imprimir o comprovante.");
    return;
  }

  const enderecoImovel = [
    contrato?.imovel?.logradouro,
    contrato?.imovel?.numero,
    contrato?.imovel?.bairro,
    contrato?.imovel?.cidade,
    contrato?.imovel?.estado,
  ]
    .filter(Boolean)
    .join(", ");
  const conteudo = `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Comprovante de pagamento - Fatura ${escaparHtml(fatura.id)}</title>
        <style>
          body { font: 16px Arial, sans-serif; color: #172033; margin: 48px auto; max-width: 720px; padding: 0 24px; }
          h1 { font-size: 24px; margin-bottom: 8px; }
          .origem { color: #586174; margin-bottom: 32px; }
          dl { border-top: 1px solid #d8deea; }
          .linha { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #d8deea; padding: 14px 0; }
          dt { color: #586174; } dd { margin: 0; text-align: right; font-weight: 600; }
          .confirmacao { margin-top: 28px; padding: 16px; background: #eef8f1; border-radius: 8px; }
          @media print { body { margin: 16mm auto; } }
        </style>
      </head>
      <body>
        <h1>Comprovante de pagamento do aluguel</h1>
        <p class="origem">Documento emitido pelo Chaveo com base na confirmação registrada pelo Asaas.</p>
        <dl>
          <div class="linha"><dt>Inquilino</dt><dd>${escaparHtml(usuario?.nome || "Não informado")}</dd></div>
          <div class="linha"><dt>Contrato</dt><dd>#${escaparHtml(contrato?.id)}</dd></div>
          <div class="linha"><dt>Imóvel</dt><dd>${escaparHtml(enderecoImovel || "Não informado")}</dd></div>
          <div class="linha"><dt>Fatura</dt><dd>#${escaparHtml(fatura.id)}</dd></div>
          <div class="linha"><dt>Valor pago</dt><dd>${escaparHtml(formatarMoeda(fatura.valor))}</dd></div>
          <div class="linha"><dt>Vencimento</dt><dd>${escaparHtml(formatarData(fatura.data_vencimento))}</dd></div>
          <div class="linha"><dt>Pagamento confirmado em</dt><dd>${escaparHtml(formatarData(fatura.data_pagamento))}</dd></div>
          <div class="linha"><dt>Identificador Asaas</dt><dd>${escaparHtml(fatura.asaas_payment_id)}</dd></div>
        </dl>
        <p class="confirmacao">Status: pagamento confirmado.</p>
      </body>
    </html>
  `;

  janelaImpressao.opener = null;
  janelaImpressao.document.write(conteudo);
  janelaImpressao.document.close();
  janelaImpressao.setTimeout(() => {
    janelaImpressao.focus();
    janelaImpressao.print();
  }, 250);
}

// Renderiza o painel interativo do inquilino com dados financeiros carregados sob demanda.
export default function DashboardInquilino() {
  const router = useRouter();
  const [contratos, setContratos] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [imovelExpandido, setImovelExpandido] = useState(null);
  const [contratoExpandido, setContratoExpandido] = useState(null);
  const [faturasPorContrato, setFaturasPorContrato] = useState({});
  const [carregandoFaturas, setCarregandoFaturas] = useState({});
  const [errosFaturas, setErrosFaturas] = useState({});
  const [gerandoCobranca, setGerandoCobranca] = useState({});
  const [mensagensCobranca, setMensagensCobranca] = useState({});
  const [historicoAberto, setHistoricoAberto] = useState({});
  const [qrAbertoPorFatura, setQrAbertoPorFatura] = useState({});
  const [imagensPixPorFatura, setImagensPixPorFatura] = useState({});
  const [carregandoPix, setCarregandoPix] = useState({});
  const [errosPix, setErrosPix] = useState({});
  const [pixCopiadoPorFatura, setPixCopiadoPorFatura] = useState({});

  const contratoAtual = contratos[0];
  const imoveisLocatario = useMemo(() => {
    const porImovel = new Map();

    contratos.forEach((contrato) => {
      const chaveImovel = String(
        contrato.imovel?.id || `sem-imovel-${contrato.id}`,
      );
      const registro = porImovel.get(chaveImovel);

      if (registro) {
        registro.contratos.push(contrato);
      } else {
        porImovel.set(chaveImovel, {
          imovel: contrato.imovel,
          contratos: [contrato],
        });
      }
    });

    return Array.from(porImovel.values());
  }, [contratos]);

  const nomeUsuario = useMemo(() => {
    if (!usuario?.nome) return "inquilino";
    return usuario.nome.trim().split(" ")[0];
  }, [usuario]);

  const carregarDados = async () => {
    const token = sessionStorage.getItem("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    setCarregando(true);
    setErro("");

    try {
      const headers = {
        Authorization: `Bearer ${token}`,
      };
      const [perfilResposta, contratosResposta] = await Promise.all([
        fetch(`${apiBaseUrl}/auth/perfil`, { headers, cache: "no-store" }),
        fetch(`${apiBaseUrl}/contratos/meus`, { headers, cache: "no-store" }),
      ]);

      if (perfilResposta.status === 401 || contratosResposta.status === 401) {
        sessionStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      const respostasComErro = [
        { recurso: "perfil", resposta: perfilResposta },
        { recurso: "contratos", resposta: contratosResposta },
      ].filter(({ resposta }) => !resposta.ok);

      if (respostasComErro.length > 0) {
        const diagnosticos = await Promise.all(
          respostasComErro.map(async ({ recurso, resposta }) => ({
            recurso,
            url: resposta.url,
            status: resposta.status,
            corpo: (
              await resposta
                .clone()
                .text()
                .catch(() => "")
            ).slice(0, 1000),
          })),
        );

        console.error(
          "Falha nas chamadas do dashboard do inquilino:",
          diagnosticos,
        );
        throw new Error("Não foi possível carregar os dados da locação.");
      }

      const perfilDados = await perfilResposta.json();
      const contratosDados = await contratosResposta.json();
      setUsuario(perfilDados.user);
      setContratos(Array.isArray(contratosDados) ? contratosDados : []);
    } catch (error) {
      console.error("Erro ao carregar dashboard do inquilino:", error);
      const mensagem =
        error instanceof TypeError &&
        error.message.toLowerCase().includes("fetch")
          ? `Não foi possível conectar à API . Verifique se o backend está em execução.`
          : error.message || "Não foi possível carregar sua locação.";
      setErro(mensagem);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const sair = () => {
    sessionStorage.removeItem("token");
    router.replace("/login");
  };

  const irParaMeuImovel = (e) => {
    e.preventDefault();
    if (!contratoAtual) return;

    const chaveImovel = `imovel-${contratoAtual.imovel?.id || contratoAtual.id}`;
    setImovelExpandido(chaveImovel);
    document.getElementById("imoveis")?.scrollIntoView({ behavior: "smooth" });
  };

  const irParaMeuContrato = (e) => {
    e.preventDefault();
    if (!contratoAtual) return;

    if (
      contratoAtual.status === "AGUARDANDO_INQUILINO" &&
      contratoAtual.convite_token
    ) {
      router.push(`/ConviteContrato?token=${contratoAtual.convite_token}`);
      return;
    }

    router.push(`/CompletarContrato?id=${contratoAtual.id}`);
  };

  // Busca o histórico financeiro do contrato e mantém a lista em memória para reabrir o painel sem nova chamada.
  const carregarFaturasDoContrato = useCallback(
    async (contratoId) => {
      const token = sessionStorage.getItem("token");
      if (!token) {
        router.replace("/login");
        return null;
      }

      setCarregandoFaturas((atuais) => ({ ...atuais, [contratoId]: true }));
      setErrosFaturas((atuais) => ({ ...atuais, [contratoId]: "" }));

      try {
        const resposta = await fetch(
          `${apiBaseUrl}/contratos/${contratoId}/faturas`,
          {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          },
        );

        if (resposta.status === 401) {
          sessionStorage.removeItem("token");
          router.replace("/login");
          return null;
        }

        const dados = await resposta.json().catch(() => ({}));
        if (!resposta.ok) {
          throw new Error(
            dados.message || "Não foi possível carregar as faturas.",
          );
        }

        const faturas = Array.isArray(dados) ? dados : [];
        setFaturasPorContrato((atuais) => ({
          ...atuais,
          [contratoId]: faturas,
        }));
        return faturas;
      } catch (erroCarregamento) {
        setErrosFaturas((atuais) => ({
          ...atuais,
          [contratoId]:
            erroCarregamento.message || "Não foi possível carregar as faturas.",
        }));
        return null;
      } finally {
        setCarregandoFaturas((atuais) => ({ ...atuais, [contratoId]: false }));
      }
    },
    [router],
  );

  // Atualiza as cobranças consultadas quando o usuário volta para a aba do dashboard.
  useEffect(() => {
    const atualizarFaturasAoRetomar = () => {
      if (document.visibilityState !== "visible") return;
      contratos
        .filter(
          (contrato) =>
            contrato.status === "CONCLUIDO" && faturasPorContrato[contrato.id],
        )
        .forEach((contrato) => void carregarFaturasDoContrato(contrato.id));
    };

    window.addEventListener("focus", atualizarFaturasAoRetomar);
    return () => window.removeEventListener("focus", atualizarFaturasAoRetomar);
  }, [contratos, faturasPorContrato, carregarFaturasDoContrato]);

  // Gera a assinatura somente quando ainda não há fatura e depois atualiza o painel com a resposta do servidor.
  const gerarOuExibirBoleto = async (contratoId) => {
    setMensagensCobranca((atuais) => ({ ...atuais, [contratoId]: "" }));
    let faturas = faturasPorContrato[contratoId];

    if (!Array.isArray(faturas)) {
      faturas = await carregarFaturasDoContrato(contratoId);
      if (faturas === null) return;
    }

    const faturaAtual = faturas.find((fatura) => !faturaEstaCancelada(fatura));
    if (faturaAtual?.pago) return;

    if (faturaAtual?.asaas_payment_id) {
      setMensagensCobranca((atuais) => ({
        ...atuais,
        [contratoId]: "A cobrança atual está exibida abaixo.",
      }));
      return;
    }

    const token = sessionStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    setGerandoCobranca((atuais) => ({ ...atuais, [contratoId]: true }));
    try {
      const resposta = await fetch(
        `${apiBaseUrl}/contratos/${contratoId}/cobranca`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (resposta.status === 401) {
        sessionStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        throw new Error(dados.message || "Não foi possível gerar a cobrança.");
      }

      const faturasAtualizadas = await carregarFaturasDoContrato(contratoId);
      if (faturasAtualizadas === null && dados.fatura) {
        setFaturasPorContrato((atuais) => ({
          ...atuais,
          [contratoId]: [dados.fatura],
        }));
      }
      setMensagensCobranca((atuais) => ({
        ...atuais,
        [contratoId]: dados.mensagem || "Cobrança consultada com sucesso.",
      }));
    } catch (erroGeracao) {
      setMensagensCobranca((atuais) => ({
        ...atuais,
        [contratoId]:
          erroGeracao.message || "Não foi possível gerar a cobrança.",
      }));
    } finally {
      setGerandoCobranca((atuais) => ({ ...atuais, [contratoId]: false }));
    }
  };

  // Copia o Pix copia e cola para a área de transferência do dispositivo do inquilino.
  const copiarCodigoPix = async (faturaId, codigoPix) => {
    try {
      await navigator.clipboard.writeText(codigoPix);
      setPixCopiadoPorFatura((atuais) => ({ ...atuais, [faturaId]: true }));
      window.setTimeout(() => {
        setPixCopiadoPorFatura((atuais) => ({ ...atuais, [faturaId]: false }));
      }, 2000);
    } catch {
      setErrosPix((atuais) => ({
        ...atuais,
        [faturaId]: "Não foi possível copiar o Pix neste navegador.",
      }));
    }
  };

  // Solicita a imagem QR ao Asaas apenas quando o inquilino pede para exibi-la; a imagem não fica salva no banco.
  const alternarQrCodePix = async (contratoId, fatura) => {
    if (qrAbertoPorFatura[fatura.id]) {
      setQrAbertoPorFatura((atuais) => ({ ...atuais, [fatura.id]: false }));
      return;
    }

    if (imagensPixPorFatura[fatura.id]) {
      setQrAbertoPorFatura((atuais) => ({ ...atuais, [fatura.id]: true }));
      return;
    }

    const token = sessionStorage.getItem("token");
    if (!token) {
      router.replace("/login");
      return;
    }

    setCarregandoPix((atuais) => ({ ...atuais, [fatura.id]: true }));
    setErrosPix((atuais) => ({ ...atuais, [fatura.id]: "" }));
    try {
      const resposta = await fetch(
        `${apiBaseUrl}/contratos/${contratoId}/faturas/${fatura.id}/pix`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
      );

      if (resposta.status === 401) {
        sessionStorage.removeItem("token");
        router.replace("/login");
        return;
      }

      const dados = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        throw new Error(
          dados.message || "Não foi possível carregar o QR Code Pix.",
        );
      }

      setImagensPixPorFatura((atuais) => ({
        ...atuais,
        [fatura.id]: dados.imagemBase64,
      }));
      setQrAbertoPorFatura((atuais) => ({ ...atuais, [fatura.id]: true }));
    } catch (erroPix) {
      setErrosPix((atuais) => ({
        ...atuais,
        [fatura.id]:
          erroPix.message || "Não foi possível carregar o QR Code Pix.",
      }));
    } finally {
      setCarregandoPix((atuais) => ({ ...atuais, [fatura.id]: false }));
    }
  };

  return (
    <div className="tenant-dashboard">
      <aside className="tenant-sidebar">
        <div>
          <div className="tenant-brand">
            <div className="tenant-brand-icon">
              <KeyRound size={20} />
            </div>
            <span>
              CHAVEO<span className="tenant-brand-dot">.</span>
            </span>
          </div>

          <nav className="tenant-navigation" aria-label="Navegação principal">
            <a className="tenant-nav-active" href="#inicio">
              <Building2 size={18} />
              Início
            </a>
            <a
              className="tenant-nav-item"
              href="#imoveis"
              onClick={irParaMeuImovel}
            >
              <MapPin size={18} />
              Meu imóvel
            </a>
            <a
              className="tenant-nav-item"
              href="#contratos"
              onClick={irParaMeuContrato}
            >
              <FileText size={18} />
              Meu contrato
            </a>
            <Link
              className="tenant-nav-item"
              href="/dashboardInquilino/minhas-notificacoes"
            >
              <Bell size={18} />
              Minhas notificações
            </Link>
            <BotaoPerfil perfilAtual="INQUILINO" className="tenant-nav-item" />
          </nav>
        </div>

        <div className="bg-[#161922]">
          <div className="space-y-3 px-4 pb-3">
            <TrocarPerfil perfilAtual="INQUILINO" />
          </div>
          <div className="tenant-user">
            <div className="tenant-avatar">
              {nomeUsuario.slice(0, 2).toUpperCase()}
            </div>
            <div className="tenant-user-data">
              <strong>{usuario?.nome || "Inquilino"}</strong>
              <span>Conta ativa</span>
            </div>
            <button
              type="button"
              onClick={sair}
              className="tenant-logout"
              title="Sair"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <main className="tenant-main" id="inicio">
        <header className="tenant-header">
          <div className="min-[769px]:hidden">
            <BotaoPerfil perfilAtual="INQUILINO" />
          </div>
          <div>
            <p className="tenant-eyebrow">Área do inquilino</p>
            <h1>Olá, {nomeUsuario}.</h1>
            <p className="tenant-subtitle">
              Consulte seu imóvel e acompanhe os dados da sua locação.
            </p>
          </div>
          <button
            type="button"
            className="tenant-refresh"
            onClick={carregarDados}
            title="Atualizar dados"
          >
            <RefreshCw size={18} />
            Atualizar
          </button>
        </header>

        {erro && <div className="tenant-alert">{erro}</div>}

        {carregando ? (
          <section className="tenant-empty">
            <RefreshCw className="tenant-loading-icon" size={28} />
            <h2>Carregando sua locação...</h2>
            <p>Estamos buscando os dados do imóvel e do contrato.</p>
          </section>
        ) : contratos.length === 0 ? (
          <section className="tenant-empty">
            <FileText size={42} />
            <h2>Nenhum contrato encontrado</h2>
            <p>
              Assim que um contrato for associado ao seu cadastro, o imóvel
              aparecerá nesta área.
            </p>
          </section>
        ) : (
          <>
            <section
              className="tenant-summary-grid"
              aria-label="Resumo da locação"
            >
              <div className="tenant-summary-card">
                <span>Aluguel mensal mais recente</span>
                <strong>{formatarMoeda(contratoAtual.valor_aluguel)}</strong>
                <Wallet size={20} />
              </div>
              <div className="tenant-summary-card">
                <span>Vencimento mensal</span>
                <strong>Dia {contratoAtual.dia_vencimento || "—"}</strong>
                <CalendarDays size={20} />
              </div>
              <div className="tenant-summary-card">
                <span>Término do contrato mais recente</span>
                <strong>{formatarData(contratoAtual.data_fim)}</strong>
                <FileText size={20} />
              </div>
            </section>

            <section
              className="tenant-records"
              id="imoveis"
              aria-label="Imóveis e contratos do inquilino"
            >
              <header className="tenant-records-heading">
                <div id="contratos">
                  <p className="tenant-eyebrow">Sua locação</p>
                  <h2>Imóveis e contratos</h2>
                  <p>
                    Veja os imóveis vinculados às suas locações e os dados de
                    cada contrato.
                  </p>
                </div>
                <span className="tenant-record-count">
                  {imoveisLocatario.length}{" "}
                  {imoveisLocatario.length === 1 ? "imóvel" : "imóveis"}
                </span>
              </header>

              <div className="tenant-record-list">
                {imoveisLocatario.map(
                  ({ imovel, contratos: contratosDoImovel }) => {
                    const chaveImovel = `imovel-${imovel?.id || contratosDoImovel[0].id}`;
                    const imovelAberto = imovelExpandido === chaveImovel;

                    return (
                      <article className="tenant-record-card" key={chaveImovel}>
                        <div
                          className="tenant-record-property"
                          id={chaveImovel}
                        >
                          <div className="tenant-record-property-icon">
                            <Building2 size={24} />
                          </div>
                          <div className="tenant-record-property-info">
                            <p className="tenant-property-type">
                              {imovel?.tipo || "Imóvel residencial"}
                            </p>
                            <h3>
                              {imovel?.logradouro || "Endereço não informado"},{" "}
                              {imovel?.numero || "s/n"}
                            </h3>
                            <p className="tenant-muted">
                              {imovel?.bairro || "Bairro não informado"} ·{" "}
                              {imovel?.cidade || "Cidade não informada"}/
                              {imovel?.estado || "--"}
                            </p>
                          </div>

                          <button
                            type="button"
                            className="tenant-more-button tenant-record-toggle"
                            onClick={() =>
                              setImovelExpandido(
                                imovelAberto ? null : chaveImovel,
                              )
                            }
                            aria-expanded={imovelAberto}
                          >
                            {imovelAberto
                              ? "Ocultar imóvel"
                              : "Ver mais do imóvel"}
                            {imovelAberto ? (
                              <ChevronUp size={17} />
                            ) : (
                              <ChevronDown size={17} />
                            )}
                          </button>
                        </div>

                        {imovelAberto && (
                          <div className="tenant-detail-list tenant-property-details">
                            <div>
                              <span>CEP</span>
                              <strong>{imovel?.cep || "Não informado"}</strong>
                            </div>
                            <div>
                              <span>Complemento</span>
                              <strong>
                                {imovel?.complemento || "Não informado"}
                              </strong>
                            </div>
                            <div>
                              <span>Tipo</span>
                              <strong>{imovel?.tipo || "Não informado"}</strong>
                            </div>
                            <div>
                              <span>Status</span>
                              <strong>
                                {imovel?.status || "Não informado"}
                              </strong>
                            </div>
                            <div>
                              <span>Proprietário</span>
                              <strong>
                                {imovel?.proprietario?.nome || "Não informado"}
                              </strong>
                            </div>
                            <div>
                              <span>Telefone</span>
                              <strong>
                                {imovel?.proprietario?.telefone ? (
                                  <a
                                    href={`tel:${imovel.proprietario.telefone}`}
                                  >
                                    {imovel.proprietario.telefone}
                                  </a>
                                ) : (
                                  "Não informado"
                                )}
                              </strong>
                            </div>
                            <div>
                              <span>E-mail</span>
                              <strong>
                                {imovel?.proprietario?.email ? (
                                  <a
                                    href={`mailto:${imovel.proprietario.email}`}
                                  >
                                    {imovel.proprietario.email}
                                  </a>
                                ) : (
                                  "Não informado"
                                )}
                              </strong>
                            </div>
                          </div>
                        )}

                        <div className="tenant-record-contracts">
                          <h4>
                            {contratosDoImovel.length === 1
                              ? "Contrato vinculado"
                              : `${contratosDoImovel.length} contratos vinculados`}
                          </h4>
                          {contratosDoImovel.map((contrato) => {
                            const chaveContrato = `contrato-${contrato.id}`;
                            const contratoAberto =
                              contratoExpandido === chaveContrato;
                            const podePagar = contrato.status === "CONCLUIDO";
                            const statusContrato = normalizarStatus(
                              contrato.status,
                            );
                            const faturasContrato =
                              faturasPorContrato[contrato.id];
                            const faturaAtual = faturasContrato?.find(
                              (fatura) => !faturaEstaCancelada(fatura),
                            );
                            const statusFaturaAtual = faturaAtual
                              ? normalizarStatusFatura(faturaAtual.status)
                              : null;
                            const faturaAtualEmAberto =
                              faturaEstaEmAberto(faturaAtual);

                            return (
                              <div
                                className="tenant-record-contract"
                                key={contrato.id}
                              >
                                <div className="tenant-record-contract-summary">
                                  <div>
                                    <span className="tenant-record-contract-label">
                                      Contrato #{contrato.id}
                                    </span>
                                    <span
                                      className={`tenant-contract-status ${statusContrato.classe}`}
                                    >
                                      <span />
                                      {statusContrato.texto}
                                    </span>
                                  </div>

                                  <div className="flex flex-wrap gap-2">
                                    {contrato.status !== "PENDENTE_DADOS" && (
                                      <button
                                        type="button"
                                        className="tenant-more-button"
                                        onClick={() => {
                                          if (
                                            contrato.status ===
                                              "AGUARDANDO_INQUILINO" &&
                                            contrato.convite_token
                                          ) {
                                            router.push(
                                              `/ConviteContrato?token=${contrato.convite_token}`,
                                            );
                                          } else {
                                            router.push(
                                              `/CompletarContrato?id=${contrato.id}`,
                                            );
                                          }
                                        }}
                                      >
                                        Acessar contrato
                                      </button>
                                    )}

                                    <button
                                      type="button"
                                      className="tenant-more-button tenant-record-toggle"
                                      onClick={() => {
                                        const vaiAbrir = !contratoAberto;
                                        setContratoExpandido(
                                          vaiAbrir ? chaveContrato : null,
                                        );
                                        if (vaiAbrir && podePagar)
                                          carregarFaturasDoContrato(
                                            contrato.id,
                                          );
                                      }}
                                      aria-expanded={contratoAberto}
                                    >
                                      {contratoAberto
                                        ? "Ocultar contrato"
                                        : "Ver mais do contrato"}
                                      {contratoAberto ? (
                                        <ChevronUp size={17} />
                                      ) : (
                                        <ChevronDown size={17} />
                                      )}
                                    </button>
                                  </div>
                                </div>

                                {contrato.status === "PENDENTE_DADOS" && (
                                  <div className="mt-4 flex justify-center">
                                    <Link
                                      href={`/CompletarContrato?id=${encodeURIComponent(contrato.id)}`}
                                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-teal-300 px-4 py-2.5 text-center text-sm font-semibold text-slate-950 shadow-sm transition-colors hover:bg-teal-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-300"
                                    >
                                      <FileCheck2
                                        size={17}
                                        className="shrink-0"
                                        aria-hidden="true"
                                      />
                                      Preencher ficha cadastral
                                      <ArrowRight
                                        size={16}
                                        className="shrink-0"
                                        aria-hidden="true"
                                      />
                                    </Link>
                                  </div>
                                )}

                                {contratoAberto && (
                                  <>
                                    <div className="tenant-detail-list">
                                      <div>
                                        <span>Aluguel mensal</span>
                                        <strong>
                                          {formatarMoeda(
                                            contrato.valor_aluguel,
                                          )}
                                        </strong>
                                      </div>
                                      <div>
                                        <span>Vencimento</span>
                                        <strong>
                                          Dia{" "}
                                          {contrato.dia_vencimento ||
                                            "Não informado"}
                                        </strong>
                                      </div>
                                      <div>
                                        <span>Início</span>
                                        <strong>
                                          {formatarData(contrato.data_inicio)}
                                        </strong>
                                      </div>
                                      <div>
                                        <span>Término</span>
                                        <strong>
                                          {formatarData(contrato.data_fim)}
                                        </strong>
                                      </div>
                                    </div>

                                    {podePagar && (
                                      <section
                                        className="tenant-payment-panel"
                                        aria-label={`Cobranças do contrato ${contrato.id}`}
                                      >
                                        <div className="tenant-payment-heading">
                                          <div>
                                            <p className="tenant-eyebrow">
                                              Financeiro
                                            </p>
                                            <h5>Pagamentos do aluguel</h5>
                                          </div>
                                          <div className="tenant-payment-actions">
                                            {Array.isArray(faturasContrato) &&
                                              !faturaAtual?.pago && (
                                                <button
                                                  type="button"
                                                  className="tenant-payment-button tenant-payment-button-primary"
                                                  onClick={() =>
                                                    gerarOuExibirBoleto(
                                                      contrato.id,
                                                    )
                                                  }
                                                  disabled={Boolean(
                                                    gerandoCobranca[
                                                      contrato.id
                                                    ] ||
                                                    carregandoFaturas[
                                                      contrato.id
                                                    ],
                                                  )}
                                                >
                                                  {gerandoCobranca[contrato.id]
                                                    ? "Gerando..."
                                                    : "Gerar Boleto"}
                                                </button>
                                              )}
                                            <button
                                              type="button"
                                              className="tenant-payment-button"
                                              onClick={() => {
                                                const vaiAbrir =
                                                  !historicoAberto[contrato.id];
                                                setHistoricoAberto(
                                                  (atuais) => ({
                                                    ...atuais,
                                                    [contrato.id]: vaiAbrir,
                                                  }),
                                                );
                                                if (vaiAbrir)
                                                  carregarFaturasDoContrato(
                                                    contrato.id,
                                                  );
                                              }}
                                            >
                                              {historicoAberto[contrato.id]
                                                ? "Ocultar Histórico"
                                                : "Ver Histórico de Pagamentos"}
                                            </button>
                                          </div>
                                        </div>

                                        {carregandoFaturas[contrato.id] && (
                                          <p className="tenant-payment-message">
                                            Carregando faturas...
                                          </p>
                                        )}
                                        {errosFaturas[contrato.id] && (
                                          <p
                                            className="tenant-payment-error"
                                            role="alert"
                                          >
                                            {errosFaturas[contrato.id]}
                                          </p>
                                        )}
                                        {mensagensCobranca[contrato.id] && (
                                          <p
                                            className="tenant-payment-message"
                                            role="status"
                                          >
                                            {mensagensCobranca[contrato.id]}
                                          </p>
                                        )}

                                        {faturaAtual && (
                                          <article
                                            className="tenant-current-invoice"
                                            aria-label="Cobrança atual"
                                          >
                                            <div className="tenant-invoice-summary">
                                              <div>
                                                <span>Vencimento</span>
                                                <strong>
                                                  {formatarData(
                                                    faturaAtual.data_vencimento,
                                                  )}
                                                </strong>
                                              </div>
                                              <div>
                                                <span>Valor</span>
                                                <strong>
                                                  {formatarMoeda(
                                                    faturaAtual.valor,
                                                  )}
                                                </strong>
                                              </div>
                                              <span
                                                className={`tenant-invoice-status ${statusFaturaAtual.classe}`}
                                              >
                                                {statusFaturaAtual.texto}
                                              </span>
                                            </div>

                                            {faturaAtualEmAberto && (
                                              <div className="tenant-invoice-actions">
                                                {faturaAtual.boleto_pdf_url && (
                                                  <a
                                                    className="tenant-payment-button"
                                                    href={
                                                      faturaAtual.boleto_pdf_url
                                                    }
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                  >
                                                    <ExternalLink size={16} />{" "}
                                                    Abrir boleto PDF
                                                  </a>
                                                )}
                                                {faturaAtual.pix_copia_e_cola && (
                                                  <>
                                                    <button
                                                      type="button"
                                                      className="tenant-payment-button"
                                                      onClick={() =>
                                                        copiarCodigoPix(
                                                          faturaAtual.id,
                                                          faturaAtual.pix_copia_e_cola,
                                                        )
                                                      }
                                                    >
                                                      <Copy size={16} />
                                                      {pixCopiadoPorFatura[
                                                        faturaAtual.id
                                                      ]
                                                        ? "Pix copiado"
                                                        : "Copiar Pix"}
                                                    </button>
                                                    <button
                                                      type="button"
                                                      className="tenant-payment-button"
                                                      onClick={() =>
                                                        alternarQrCodePix(
                                                          contrato.id,
                                                          faturaAtual,
                                                        )
                                                      }
                                                      disabled={Boolean(
                                                        carregandoPix[
                                                          faturaAtual.id
                                                        ],
                                                      )}
                                                    >
                                                      <QrCode size={16} />
                                                      {carregandoPix[
                                                        faturaAtual.id
                                                      ]
                                                        ? "Carregando QR..."
                                                        : qrAbertoPorFatura[
                                                              faturaAtual.id
                                                            ]
                                                          ? "Ocultar QR Pix"
                                                          : "Mostrar QR Pix"}
                                                    </button>
                                                  </>
                                                )}
                                              </div>
                                            )}

                                            {faturaAtual.pago && (
                                              <div className="tenant-invoice-actions">
                                                <button
                                                  type="button"
                                                  className="tenant-payment-button"
                                                  onClick={() =>
                                                    imprimirComprovantePagamento(
                                                      faturaAtual,
                                                      contrato,
                                                      usuario,
                                                    )
                                                  }
                                                >
                                                  <Printer size={16} /> Imprimir
                                                  comprovante
                                                </button>
                                              </div>
                                            )}

                                            {!faturaAtual.asaas_payment_id && (
                                              <p className="tenant-payment-message">
                                                A cobrança foi preparada e
                                                aparecerá aqui quando o Asaas a
                                                emitir.
                                              </p>
                                            )}

                                            {errosPix[faturaAtual.id] && (
                                              <p
                                                className="tenant-payment-error"
                                                role="alert"
                                              >
                                                {errosPix[faturaAtual.id]}
                                              </p>
                                            )}
                                            {qrAbertoPorFatura[
                                              faturaAtual.id
                                            ] &&
                                              imagensPixPorFatura[
                                                faturaAtual.id
                                              ] && (
                                                <div className="tenant-pix-qr">
                                                  <Image
                                                    src={obterFonteImagemPix(
                                                      imagensPixPorFatura[
                                                        faturaAtual.id
                                                      ],
                                                    )}
                                                    alt="QR Code Pix da cobrança atual"
                                                    width={220}
                                                    height={220}
                                                    unoptimized
                                                  />
                                                </div>
                                              )}
                                          </article>
                                        )}

                                        {historicoAberto[contrato.id] && (
                                          <div className="tenant-invoice-history">
                                            <h6>Histórico de pagamentos</h6>
                                            {!carregandoFaturas[contrato.id] &&
                                              faturasContrato?.length === 0 && (
                                                <p className="tenant-payment-message">
                                                  Ainda não há faturas
                                                  registradas para este
                                                  contrato.
                                                </p>
                                              )}
                                            {faturasContrato?.map((fatura) => {
                                              const statusFatura =
                                                normalizarStatusFatura(
                                                  fatura.status,
                                                );
                                              const faturaEmAberto =
                                                faturaEstaEmAberto(fatura);

                                              return (
                                                <article
                                                  className="tenant-history-invoice"
                                                  key={fatura.id}
                                                >
                                                  <div className="tenant-history-invoice-data">
                                                    <div>
                                                      <span>Vencimento</span>
                                                      <strong>
                                                        {formatarData(
                                                          fatura.data_vencimento,
                                                        )}
                                                      </strong>
                                                    </div>
                                                    <div>
                                                      <span>Valor</span>
                                                      <strong>
                                                        {formatarMoeda(
                                                          fatura.valor,
                                                        )}
                                                      </strong>
                                                    </div>
                                                    <span
                                                      className={`tenant-invoice-status ${statusFatura.classe}`}
                                                    >
                                                      {statusFatura.texto}
                                                    </span>
                                                  </div>
                                                  {faturaEmAberto && (
                                                    <div className="tenant-invoice-actions">
                                                      {fatura.boleto_pdf_url && (
                                                        <a
                                                          className="tenant-payment-button"
                                                          href={
                                                            fatura.boleto_pdf_url
                                                          }
                                                          target="_blank"
                                                          rel="noopener noreferrer"
                                                        >
                                                          <ExternalLink
                                                            size={16}
                                                          />{" "}
                                                          Segunda via do boleto
                                                        </a>
                                                      )}
                                                      {fatura.pix_copia_e_cola && (
                                                        <button
                                                          type="button"
                                                          className="tenant-payment-button"
                                                          onClick={() =>
                                                            copiarCodigoPix(
                                                              fatura.id,
                                                              fatura.pix_copia_e_cola,
                                                            )
                                                          }
                                                        >
                                                          <Copy size={16} />
                                                          {pixCopiadoPorFatura[
                                                            fatura.id
                                                          ]
                                                            ? "Pix copiado"
                                                            : "Copiar Pix"}
                                                        </button>
                                                      )}
                                                    </div>
                                                  )}
                                                  {fatura.pago && (
                                                    <div className="tenant-invoice-actions">
                                                      <button
                                                        type="button"
                                                        className="tenant-payment-button"
                                                        onClick={() =>
                                                          imprimirComprovantePagamento(
                                                            fatura,
                                                            contrato,
                                                            usuario,
                                                          )
                                                        }
                                                      >
                                                        <Printer size={16} />{" "}
                                                        Imprimir comprovante
                                                      </button>
                                                    </div>
                                                  )}
                                                </article>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </section>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </article>
                    );
                  },
                )}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
