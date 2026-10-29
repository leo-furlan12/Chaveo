"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronUp,
  FileText,
  KeyRound,
  LogOut,
  MapPin,
  RefreshCw,
  Wallet,
} from "lucide-react";
import "./style.css";


const apiBaseUrl = "http://localhost:4000/api";

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

export default function DashboardInquilino() {
  const router = useRouter();
  const [contratos, setContratos] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");
  const [detalheAberto, setDetalheAberto] = useState(null);

  const contratoAtual = contratos[0];
  const imoveisLocatario = useMemo(() => {
    const porImovel = new Map();

    contratos.forEach((contrato) => {
      const chaveImovel = String(contrato.imovel?.id || `sem-imovel-${contrato.id}`);
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

      if (
        perfilResposta.status === 401 ||
        contratosResposta.status === 401
      ) {
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
            corpo: (await resposta.clone().text().catch(() => "")).slice(0, 1000),
          })),
        );

        console.error("Falha nas chamadas do dashboard do inquilino:", diagnosticos);
        throw new Error("Não foi possível carregar os dados da locação.");
      }

      const perfilDados = await perfilResposta.json();
      const contratosDados = await contratosResposta.json();
      setUsuario(perfilDados.user);
      setContratos(Array.isArray(contratosDados) ? contratosDados : []);
    } catch (error) {
      console.error("Erro ao carregar dashboard do inquilino:", error);
      const mensagem =
        error instanceof TypeError && error.message.toLowerCase().includes("fetch")
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

  const alternarDetalhe = (chave) => {
    setDetalheAberto((atual) => (atual === chave ? null : chave));
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
            <a className="tenant-nav-item" href="#imoveis">
              <MapPin size={18} />
              Meu imóvel
            </a>
            <a className="tenant-nav-item" href="#contratos">
              <FileText size={18} />
              Meu contrato
            </a>
          </nav>
        </div>

        <div className="tenant-user">
          <div className="tenant-avatar">
            {nomeUsuario.slice(0, 2).toUpperCase()}
          </div>
          <div className="tenant-user-data">
            <strong>{usuario?.nome || "Inquilino"}</strong>
            <span>Conta ativa</span>
          </div>
          <button type="button" onClick={sair} className="tenant-logout" title="Sair">
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      <main className="tenant-main" id="inicio">
        <header className="tenant-header">
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
            <section className="tenant-summary-grid" aria-label="Resumo da locação">
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

            <section className="tenant-records" id="imoveis" aria-label="Imóveis e contratos do inquilino">
              <header className="tenant-records-heading">
                <div id="contratos">
                  <p className="tenant-eyebrow">Sua locação</p>
                  <h2>Imóveis e contratos</h2>
                  <p>Veja os imóveis vinculados às suas locações e os dados de cada contrato.</p>
                </div>
                <span className="tenant-record-count">
                  {imoveisLocatario.length} {imoveisLocatario.length === 1 ? "imóvel" : "imóveis"}
                </span>
              </header>

              <div className="tenant-record-list">
                {imoveisLocatario.map(({ imovel, contratos: contratosDoImovel }) => {
                  const chaveImovel = `imovel-${imovel?.id || contratosDoImovel[0].id}`;
                  const imovelAberto = detalheAberto === chaveImovel;

                  return (
                    <article className="tenant-record-card" key={chaveImovel}>
                      <div className="tenant-record-property" id={chaveImovel}>
                        <div className="tenant-record-property-icon">
                          <Building2 size={24} />
                        </div>
                        <div className="tenant-record-property-info">
                          <p className="tenant-property-type">{imovel?.tipo || "Imóvel residencial"}</p>
                          <h3>
                            {imovel?.logradouro || "Endereço não informado"}, {imovel?.numero || "s/n"}
                          </h3>
                          <p className="tenant-muted">
                            {imovel?.bairro || "Bairro não informado"} · {imovel?.cidade || "Cidade não informada"}/{imovel?.estado || "--"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="tenant-more-button tenant-record-toggle"
                          onClick={() => alternarDetalhe(chaveImovel)}
                          aria-expanded={imovelAberto}
                        >
                          {imovelAberto ? "Ocultar imóvel" : "Ver mais do imóvel"}
                          {imovelAberto ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                        </button>
                      </div>

                      {imovelAberto && (
                        <div className="tenant-detail-list tenant-property-details">
                          <div><span>CEP</span><strong>{imovel?.cep || "Não informado"}</strong></div>
                          <div><span>Complemento</span><strong>{imovel?.complemento || "Não informado"}</strong></div>
                          <div><span>Tipo</span><strong>{imovel?.tipo || "Não informado"}</strong></div>
                          <div><span>Status</span><strong>{imovel?.status || "Não informado"}</strong></div>
                          <div><span>Proprietário</span><strong>{imovel?.proprietario?.nome || "Não informado"}</strong></div>
                          <div>
                            <span>Telefone</span>
                            <strong>
                              {imovel?.proprietario?.telefone ? (
                                <a href={`tel:${imovel.proprietario.telefone}`}>
                                  {imovel.proprietario.telefone}
                                </a>
                              ) : "Não informado"}
                            </strong>
                          </div>
                          <div>
                            <span>E-mail</span>
                            <strong>
                              {imovel?.proprietario?.email ? (
                                <a href={`mailto:${imovel.proprietario.email}`}>
                                  {imovel.proprietario.email}
                                </a>
                              ) : "Não informado"}
                            </strong>
                          </div>
                        </div>
                      )}

                      <div className="tenant-record-contracts">
                        <h4>
                          {contratosDoImovel.length === 1 ? "Contrato vinculado" : `${contratosDoImovel.length} contratos vinculados`}
                        </h4>
                        {contratosDoImovel.map((contrato) => {
                          const chaveContrato = `contrato-${contrato.id}`;
                          const contratoAberto = detalheAberto === chaveContrato;
                          const statusContrato = normalizarStatus(contrato.status);

                          return (
                            <div className="tenant-record-contract" key={contrato.id}>
                              <div className="tenant-record-contract-summary">
                                <div>
                                  <span className="tenant-record-contract-label">Contrato #{contrato.id}</span>
                                  <span className={`tenant-contract-status ${statusContrato.classe}`}>
                                    <span />
                                    {statusContrato.texto}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="tenant-more-button tenant-record-toggle"
                                  onClick={() => alternarDetalhe(chaveContrato)}
                                  aria-expanded={contratoAberto}
                                >
                                  {contratoAberto ? "Ocultar contrato" : "Ver mais do contrato"}
                                  {contratoAberto ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                                </button>
                              </div>

                              {contratoAberto && (
                                <div className="tenant-detail-list">
                                  <div><span>Aluguel mensal</span><strong>{formatarMoeda(contrato.valor_aluguel)}</strong></div>
                                  <div><span>Vencimento</span><strong>Dia {contrato.dia_vencimento || "Não informado"}</strong></div>
                                  <div><span>Início</span><strong>{formatarData(contrato.data_inicio)}</strong></div>
                                  <div><span>Término</span><strong>{formatarData(contrato.data_fim)}</strong></div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
