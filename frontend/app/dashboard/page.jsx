"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Home,
  KeyRound,
  Wallet,
  Plus,
  Search,
  RefreshCw,
  Edit3,
  Trash2,
  Eye,
  LayoutDashboard,
  LogOut,
  MapPin,
  Lock,
} from "lucide-react";
import "./style.css";

export default function DashboardProprietario() {
  const router = useRouter();
  const [abaAtiva, setAbaAtiva] = useState("visao-geral");
  const [imoveis, setImoveis] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");
  const [filtroTipo, setFiltroTipo] = useState("TODOS");
  const [avisoRegra, setAvisoRegra] = useState("");

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

  const carregarImoveis = async () => {
    setCarregando(true);
    try {
      const resposta = await fetch(`${apiUrl}/api/imoveis`);
      if (resposta.ok) {
        const dados = await resposta.json();
        setImoveis(Array.isArray(dados) ? dados : dados.dados || []);
      } else {
        setImoveis([]);
      }
    } catch (erro) {
      console.error("Aviso ao conectar com a API:", erro);
      setImoveis([]);
    } finally {
      setCarregando(false);
    }
  };

  useEffect(() => {
    carregarImoveis();
  }, []);

  // AÇÃO: Excluir imóvel direto
  const excluirImovel = async (id) => {
    try {
      const resposta = await fetch(`${apiUrl}/api/imoveis/${id}`, {
        method: "DELETE",
      });

      if (resposta.ok) {
        setImoveis((listaAtual) =>
          listaAtual.filter((item) => String(item.id) !== String(id))
        );
      } else {
        const erroDados = await resposta.json().catch(() => ({}));
        setAvisoRegra(erroDados.mensagem || "Não foi possível excluir o imóvel.");
      }
    } catch (erro) {
      console.error("Erro ao excluir imóvel:", erro);
      setAvisoRegra("Erro de conexão ao tentar excluir o imóvel.");
    }
  };

  // AÇÃO: Redirecionar para edição (respeitando a Regra de Negócio)
  const irParaEdicao = (imovel) => {
    if (imovel.status?.toUpperCase() === "ALUGADO") {
      setAvisoRegra(
        `Bloqueado: O imóvel #${imovel.id} (${imovel.logradouro}, ${imovel.numero}) está com status ALUGADO e suas informações não podem ser alteradas.`
      );
      return;
    }
    router.push(`/imoveis/cadastro?id=${imovel.id}`);
  };

  // Cálculos dinâmicos dos Cards
  const totalImoveis = imoveis.length;
  const totalAlugados = imoveis.filter(
    (item) => item.status?.toUpperCase() === "ALUGADO"
  ).length;
  const totalDisponiveis = imoveis.filter(
    (item) =>
      item.status?.toUpperCase() === "DISPONIVEL" ||
      item.status?.toUpperCase() === "DISPONÍVEL" ||
      item.status?.toUpperCase() === "VAGO"
  ).length;

  const taxaOcupacao =
    totalImoveis > 0 ? Math.round((totalAlugados / totalImoveis) * 100) : 0;

  // Filtragem para a tabela (Busca + Status + Tipo)
  const imoveisFiltrados = imoveis.filter((imovel) => {
    const termo = busca.toLowerCase();
    const enderecoMatch =
      imovel.logradouro?.toLowerCase().includes(termo) ||
      imovel.bairro?.toLowerCase().includes(termo) ||
      imovel.cidade?.toLowerCase().includes(termo) ||
      imovel.cep?.includes(termo);

    const statusAtual = imovel.status?.toUpperCase() || "";
    const statusMatch =
      filtroStatus === "TODOS" || statusAtual === filtroStatus;

    const tipoAtual = (imovel.tipo || imovel.tipo_imovel || "").toUpperCase();
    const tipoMatch = filtroTipo === "TODOS" || tipoAtual === filtroTipo;

    return enderecoMatch && statusMatch && tipoMatch;
  });

  const renderizarBadgeStatus = (status) => {
    const s = status?.toUpperCase() || "DISPONIVEL";
    if (s === "ALUGADO") {
      return (
        <span className="badge-alugado">
          <span className="status-dot" />
          Alugado
        </span>
      );
    }
    if (s === "MANUTENCAO" || s === "MANUTENÇÃO") {
      return (
        <span className="badge-manutencao">
          <span className="status-dot" />
          Manutenção
        </span>
      );
    }
    return (
      <span className="badge-disponivel">
        <span className="status-dot" />
        Disponível
      </span>
    );
  };

  return (
    <div className="dashboard-wrapper">
      {/* MENU LATERAL FIXO */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-header">
            <div className="brand-icon">
              <KeyRound size={20} />
            </div>
            <span className="brand-title">
              CHAVEO<span className="brand-dot">.</span>
            </span>
          </div>

          <nav className="sidebar-nav">
            <button
              onClick={() => setAbaAtiva("visao-geral")}
              className={
                abaAtiva === "visao-geral" ? "nav-item-active" : "nav-item"
              }
            >
              <LayoutDashboard size={18} />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => setAbaAtiva("meus-imoveis")}
              className={
                abaAtiva === "meus-imoveis" ? "nav-item-active" : "nav-item"
              }
            >
              <Building2 size={18} />
              <span>Meus Imóveis</span>
            </button>

            <button
              onClick={() => setAbaAtiva("pagamentos")}
              className={
                abaAtiva === "pagamentos" ? "nav-item-active" : "nav-item"
              }
            >
              <Wallet size={18} />
              <span>Controle de Pagamentos</span>
            </button>
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="user-card">
            <div className="user-info">
              <div className="user-avatar">PR</div>
              <div>
                <p className="user-name">Proprietário</p>
                <p className="user-role">Conta Ativa</p>
              </div>
            </div>
            <Link href="/login" className="logout-btn" title="Sair">
              <LogOut size={18} />
            </Link>
          </div>
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="main-area">
        {/* TOPBAR */}
        <header className="topbar">
          <div>
            <h1 className="page-title">
              {abaAtiva === "visao-geral" && "Dashboard do Proprietário"}
              {abaAtiva === "meus-imoveis" && "Gerenciar Meus Imóveis"}
              {abaAtiva === "pagamentos" && "Controle de Pagamentos"}
            </h1>
            <p className="page-subtitle">
              Acompanhe seus imóveis cadastrados e gerencie seu patrimônio em tempo real.
            </p>
          </div>

          <div className="topbar-actions">
            <button
              onClick={carregarImoveis}
              className="btn-refresh"
              title="Sincronizar com o banco de dados"
            >
              <RefreshCw size={18} />
            </button>

            <Link href="/imoveis/cadastro" className="btn-primary">
              <Plus size={18} />
              <span>Novo Imóvel</span>
            </Link>
          </div>
        </header>

        {/* CONTEÚDO DINÂMICO */}
        <div className="content-body">
          {/* ALERTA DE REGRA DE NEGÓCIO */}
          {avisoRegra && (
            <div className="rule-alert">
              <span>{avisoRegra}</span>
              <button
                onClick={() => setAvisoRegra("")}
                className="rule-alert-close"
              >
                Fechar
              </button>
            </div>
          )}

          {/* BLOCOS DE RESUMO (CARDS) */}
          {abaAtiva === "visao-geral" && (
            <section className="stats-grid">
              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Total de Imóveis</span>
                  <div className="stat-icon-teal">
                    <Building2 size={20} />
                  </div>
                </div>
                <div className="stat-value">{totalImoveis}</div>
                <p className="stat-desc">
                  Unidades registradas no <span className="stat-highlight">Chaveo</span>
                </p>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Imóveis Alugados</span>
                  <div className="stat-icon-emerald">
                    <KeyRound size={20} />
                  </div>
                </div>
                <div className="stat-value">{totalAlugados}</div>
                <p className="stat-desc">
                  Gerando receita ativa no momento
                </p>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Imóveis Disponíveis</span>
                  <div className="stat-icon-amber">
                    <Home size={20} />
                  </div>
                </div>
                <div className="stat-value">{totalDisponiveis}</div>
                <p className="stat-desc">
                  Prontos para locação imediata
                </p>
              </div>

              <div className="stat-card">
                <div className="stat-header">
                  <span className="stat-label">Taxa de Ocupação</span>
                  <div className="stat-icon-purple">
                    <Wallet size={20} />
                  </div>
                </div>
                <div className="stat-value">{taxaOcupacao}%</div>
                <p className="stat-desc">
                  Aproveitamento atual da carteira
                </p>
              </div>
            </section>
          )}

          {/* LISTAGEM E CRUD DE IMÓVEIS */}
          {(abaAtiva === "visao-geral" || abaAtiva === "meus-imoveis") && (
            <section className="section-box">
              <div className="section-header">
                <div className="section-title-group">
                  <div className="section-title">
                    <span>
                      {abaAtiva === "visao-geral"
                        ? "Imóveis Recentes da Carteira"
                        : "Catálogo Completo de Imóveis (CRUD)"}
                    </span>
                    <span className="section-count">
                      {imoveisFiltrados.length}
                    </span>
                  </div>
                  <p className="section-subtitle">
                    Visualize, edite ou remova os imóveis cadastrados no PostgreSQL.
                  </p>
                </div>

                {/* BARRA DE BUSCA E FILTROS */}
                <div className="controls-bar">
                  <div className="search-box">
                    <Search className="search-icon" />
                    <input
                      type="text"
                      placeholder="Buscar rua, bairro, CEP..."
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className="search-input"
                    />
                  </div>

                  <select
                    value={filtroStatus}
                    onChange={(e) => setFiltroStatus(e.target.value)}
                    className="filter-select"
                  >
                    <option value="TODOS">Todos os Status</option>
                    <option value="DISPONIVEL">Disponível</option>
                    <option value="ALUGADO">Alugado</option>
                    <option value="MANUTENCAO">Em Manutenção</option>
                  </select>

                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="filter-select"
                  >
                    <option value="TODOS">Todos os Tipos</option>
                    <option value="APARTAMENTO">Apartamento</option>
                    <option value="CASA">Casa</option>
                    <option value="KITNET">Kitnet</option>
                    <option value="COMERCIAL">Comercial</option>
                    <option value="TERRENO">Terreno</option>
                  </select>
                </div>
              </div>

              {/* TABELA DE DADOS */}
              {carregando ? (
                <div className="empty-container">
                  <p className="empty-title">Carregando imóveis...</p>
                  <p className="empty-text">
                    Buscando registros no servidor NestJS.
                  </p>
                </div>
              ) : imoveisFiltrados.length === 0 ? (
                <div className="empty-container">
                  <MapPin className="empty-icon" />
                  <p className="empty-title">Nenhum imóvel encontrado</p>
                  <p className="empty-text">
                    Assim que você cadastrar um imóvel ou ajustar os filtros, ele aparecerá listado aqui.
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table">
                    <thead className="table-head">
                      <tr>
                        <th className="table-th">#ID</th>
                        <th className="table-th">Endereço do Imóvel</th>
                        <th className="table-th">Bairro / Cidade</th>
                        <th className="table-th">Tipo</th>
                        <th className="table-th">Status</th>
                        <th className="table-th-right">Ações (CRUD)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {imoveisFiltrados.map((imovel) => {
                        const estaAlugado =
                          imovel.status?.toUpperCase() === "ALUGADO";

                        return (
                          <tr key={imovel.id} className="table-row">
                            <td className="table-td">#{imovel.id}</td>
                            <td className="table-td">
                              <p className="address-primary">
                                {imovel.logradouro}, {imovel.numero}
                              </p>
                              <p className="address-secondary">
                                {imovel.complemento
                                  ? `${imovel.complemento} • CEP: ${imovel.cep}`
                                  : `CEP: ${imovel.cep}`}
                              </p>
                            </td>
                            <td className="table-td">
                              <p className="address-primary">{imovel.bairro}</p>
                              <p className="address-secondary">
                                {imovel.cidade} - {imovel.estado}
                              </p>
                            </td>
                            <td className="table-td">
                              <span className="type-tag">
                                {imovel.tipo || imovel.tipo_imovel || "Imóvel"}
                              </span>
                            </td>
                            <td className="table-td">
                              {renderizarBadgeStatus(imovel.status)}
                            </td>
                            <td className="actions-cell">
                              <button
                                className="action-btn-view"
                                title="Ver Detalhes"
                                onClick={() =>
                                  setAvisoRegra(
                                    `Imóvel #${imovel.id}: ${imovel.logradouro}, ${imovel.numero} (${imovel.bairro} - ${imovel.cidade}/${imovel.estado}) | Status: ${imovel.status}`
                                  )
                                }
                              >
                                <Eye size={17} />
                              </button>

                              <button
                                className={
                                  estaAlugado
                                    ? "action-btn-disabled"
                                    : "action-btn-edit"
                                }
                                title={
                                  estaAlugado
                                    ? "Imóvel alugado não pode ser editado"
                                    : "Editar Imóvel"
                                }
                                onClick={() => irParaEdicao(imovel)}
                              >
                                {estaAlugado ? (
                                  <Lock size={17} />
                                ) : (
                                  <Edit3 size={17} />
                                )}
                              </button>

                              <button
                                className="action-btn-delete"
                                title="Excluir Imóvel"
                                onClick={() => excluirImovel(imovel.id)}
                              >
                                <Trash2 size={17} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}