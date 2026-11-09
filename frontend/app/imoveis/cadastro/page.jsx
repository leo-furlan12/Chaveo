"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import './style.css';

const ESTADOS_BRASILEIROS = [
  { sigla: 'AC', nome: 'Acre' },
  { sigla: 'AL', nome: 'Alagoas' },
  { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' },
  { sigla: 'BA', nome: 'Bahia' },
  { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' },
  { sigla: 'ES', nome: 'Espírito Santo' },
  { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' },
  { sigla: 'MT', nome: 'Mato Grosso' },
  { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' },
  { sigla: 'PA', nome: 'Pará' },
  { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' },
  { sigla: 'PE', nome: 'Pernambuco' },
  { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' },
  { sigla: 'RN', nome: 'Rio Grande do Norte' },
  { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' },
  { sigla: 'RR', nome: 'Roraima' },
  { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' },
  { sigla: 'SE', nome: 'Sergipe' },
  { sigla: 'TO', nome: 'Tocantins' }
];

const TIPOS_IMOVEL = [
  'Casa',
  'Apartamento',
  'Sala Comercial',
  'Galpão',
  'Terreno'
];

const STATUS_IMOVEL = [
  { valor: 'Alugado', rotulo: 'Alugado' },
  { valor: 'Disponível', rotulo: 'Disponível' },
  { valor: 'Manutenção', rotulo: 'Em Manutenção' },
  { valor: 'Inativo', rotulo: 'Inativo' }
];

function ConteudoCadastrarImovel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const imovelId = searchParams.get('id');
  const modoEdicao = Boolean(imovelId);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const [dadosImovel, setDadosImovel] = useState({
    cep: '',
    bairro: '',
    logradouro: '',
    numero: '',
    complemento: '',
    cidade: '',
    estado: '',
    tipo: '',
    status: ''
  });

  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const [bloqueadoPorAluguel, setBloqueadoPorAluguel] = useState(false);

  // Função auxiliar para normalizar o status vindo do banco com as opções do select
  const normalizarStatus = (statusBanco) => {
    if (!statusBanco) return '';
    const s = statusBanco.toUpperCase();
    if (s === 'ALUGADO') return 'Alugado';
    if (s === 'DISPONIVEL' || s === 'DISPONÍVEL') return 'Disponível';
    if (s === 'MANUTENCAO' || s === 'MANUTENÇÃO') return 'Manutenção';
    if (s === 'INATIVO') return 'Inativo';
    return statusBanco;
  };

  // Se tiver ?id= na URL, busca os dados do imóvel no backend para preencher o formulário
  useEffect(() => {
    if (!imovelId) return;

    const carregarImovelParaEdicao = async () => {
      setCarregando(true);
      setErro('');
      try {
        const resposta = await fetch(`${apiUrl}/api/imoveis/${imovelId}`);
        if (!resposta.ok) {
          throw new Error('Não foi possível encontrar os dados deste imóvel.');
        }

        const dados = await resposta.json();

        // REGRA DE NEGÓCIO: Se o imóvel estiver Alugado, proíbe qualquer edição
        if (dados.status?.toUpperCase() === 'ALUGADO') {
          setBloqueadoPorAluguel(true);
        }

        // Formata o CEP com tracinho ao carregar
        let cepFormatado = (dados.cep || '').replace(/\D/g, '');
        if (cepFormatado.length > 5) {
          cepFormatado = cepFormatado.replace(/^(\d{5})(\d)/, '$1-$2');
        }

        setDadosImovel({
          cep: cepFormatado,
          bairro: dados.bairro || '',
          logradouro: dados.logradouro || '',
          numero: dados.numero || '',
          complemento: dados.complemento || '',
          cidade: dados.cidade || '',
          estado: dados.estado || '',
          tipo: dados.tipo || dados.tipo_imovel || '',
          status: normalizarStatus(dados.status)
        });
      } catch (err) {
        setErro(err.message || 'Erro ao carregar os dados do imóvel.');
      } finally {
        setCarregando(false);
      }
    };

    carregarImovelParaEdicao();
  }, [imovelId, apiUrl]);

  // 1. Função que vai no ViaCEP buscar os dados na internet
  const buscarCep = async (cepDigitado) => {
    if (bloqueadoPorAluguel) return;
    const cepNumeros = cepDigitado.replace(/\D/g, '');

    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cepNumeros}/json/`);
      const dados = await resposta.json();

      if (!dados.erro) {
        setDadosImovel((estadoAnterior) => ({
          ...estadoAnterior,
          logradouro: dados.logradouro || estadoAnterior.logradouro,
          bairro: dados.bairro || estadoAnterior.bairro,
          cidade: dados.localidade || estadoAnterior.cidade,
          estado: dados.uf || estadoAnterior.estado
        }));
      }
    } catch (erroCep) {
      console.error('Erro ao buscar o CEP:', erroCep);
    }
  };

  // 2. Função atualizada com máscara de CEP e gatilho da busca
  const lidarComMudanca = (e) => {
    if (bloqueadoPorAluguel) return;
    let { id, value } = e.target;

    if (id === 'cep') {
      value = value.replace(/\D/g, '');
      if (value.length > 5) {
        value = value.replace(/^(\d{5})(\d)/, '$1-$2');
      }
    }

    setDadosImovel((estadoAnterior) => ({
      ...estadoAnterior,
      [id]: value
    }));

    if (id === 'cep' && value.replace(/\D/g, '').length === 8) {
      buscarCep(value);
    }
  };

  // 3. Volta para a Dashboard ao clicar em Cancelar ou no X
  const voltarParaDashboard = () => {
    router.push('/dashboard');
  };

  // 4. Salva no banco (POST para novo ou PATCH para edição) e retorna para a Dashboard
  const lidarComEnvio = async (e) => {
    e.preventDefault();
    if (bloqueadoPorAluguel) return;

    setSalvando(true);
    setErro('');

    try {
      const url = modoEdicao
        ? `${apiUrl}/api/imoveis/${imovelId}`
        : `${apiUrl}/api/imoveis`;
      const metodo = modoEdicao ? 'PATCH' : 'POST';

      const pacoteParaBanco = {
        ...dadosImovel,
        cep: dadosImovel.cep.replace(/\D/g, ''),
        proprietario_id: '1'
      };

      const resposta = await fetch(url, {
        method: metodo,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(pacoteParaBanco)
      });

      if (!resposta.ok) {
        const erroJson = await resposta.json().catch(() => ({}));
        throw new Error(
          erroJson.mensagem || 'Erro ao salvar as informações do imóvel.'
        );
      }

      router.push('/dashboard');
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <>
      <div className="fundo-dashboard-falso"></div>

      <div className="pelicula-escura">
        <div className="caixa-modal">
          <header className="cabecalho-modal">
            <h2 className="titulo-modal">
              {modoEdicao ? `Editar Imóvel #${imovelId}` : 'Cadastrar Novo Imóvel'}
            </h2>
            <button
              type="button"
              className="botao-fechar"
              title="Fechar"
              onClick={voltarParaDashboard}
            >
              X
            </button>
          </header>

          <main className="corpo-modal">
            {erro && <div className="alerta-erro">{erro}</div>}

            {bloqueadoPorAluguel && (
              <div className="alerta-bloqueio">
                ⚠️ Regra de Negócio: Este imóvel está com status Alugado. O proprietário está proibido de alterar suas informações.
              </div>
            )}

            {carregando ? (
              <div className="texto-carregando">
                Carregando dados do imóvel...
              </div>
            ) : (
              <form id="formulario-imovel" onSubmit={lidarComEnvio}>
                <h3 className="titulo-secao">
                  <img
                    src="/icones-homepage/casa.svg"
                    alt="Ícone Localização"
                    className="icone-secao"
                  />
                  Localização
                </h3>

                <div className="grade-formulario">
                  <div className="grupo-input">
                    <label htmlFor="cep" className="rotulo">CEP</label>
                    <input
                      type="text"
                      id="cep"
                      className="campo-digitacao"
                      placeholder="00000-000"
                      maxLength="9"
                      required
                      disabled={bloqueadoPorAluguel}
                      value={dadosImovel.cep}
                      onChange={lidarComMudanca}
                    />
                  </div>

                  <div className="grupo-input">
                    <label htmlFor="bairro" className="rotulo">Bairro</label>
                    <input
                      type="text"
                      id="bairro"
                      className="campo-digitacao"
                      placeholder="Ex: Centro"
                      required
                      disabled={bloqueadoPorAluguel}
                      value={dadosImovel.bairro}
                      onChange={lidarComMudanca}
                    />
                  </div>

                  <div className="grupo-input linha-inteira">
                    <label htmlFor="logradouro" className="rotulo">
                      Logradouro (Rua, Avenida)
                    </label>
                    <input
                      type="text"
                      id="logradouro"
                      className="campo-digitacao"
                      placeholder="Ex: Avenida Brasil"
                      required
                      disabled={bloqueadoPorAluguel}
                      value={dadosImovel.logradouro}
                      onChange={lidarComMudanca}
                    />
                  </div>

                  <div className="grupo-input">
                    <label htmlFor="numero" className="rotulo">Número</label>
                    <input
                      type="text"
                      id="numero"
                      className="campo-digitacao"
                      placeholder="Ex: 1500 ou S/N"
                      required
                      disabled={bloqueadoPorAluguel}
                      value={dadosImovel.numero}
                      onChange={lidarComMudanca}
                    />
                  </div>

                  <div className="grupo-input">
                    <label htmlFor="complemento" className="rotulo">
                      Complemento <span className="texto-opcional">(Opcional)</span>
                    </label>
                    <input
                      type="text"
                      id="complemento"
                      className="campo-digitacao"
                      placeholder="Ex: Apto 302, Bloco B"
                      disabled={bloqueadoPorAluguel}
                      value={dadosImovel.complemento}
                      onChange={lidarComMudanca}
                    />
                  </div>

                  <div className="grupo-input">
                    <label htmlFor="cidade" className="rotulo">Cidade</label>
                    <input
                      type="text"
                      id="cidade"
                      className="campo-digitacao"
                      placeholder="Ex: Campo Mourão"
                      required
                      disabled={bloqueadoPorAluguel}
                      value={dadosImovel.cidade}
                      onChange={lidarComMudanca}
                    />
                  </div>

                  <div className="grupo-input">
                    <label htmlFor="estado" className="rotulo">Estado</label>
                    <select
                      id="estado"
                      className="campo-digitacao campo-selecao"
                      required
                      disabled={bloqueadoPorAluguel}
                      value={dadosImovel.estado}
                      onChange={lidarComMudanca}
                    >
                      <option value="" disabled>Selecione o estado</option>
                      {ESTADOS_BRASILEIROS.map((estado) => (
                        <option key={estado.sigla} value={estado.sigla}>
                          {estado.nome} ({estado.sigla})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <h3 className="titulo-secao margem-topo">
                  <img
                    src="/icones-homepage/contrato.svg"
                    alt="Ícone Detalhes"
                    className="icone-secao"
                  />
                  Detalhes do Imóvel
                </h3>

                <div className="grade-formulario sem-margem-fundo">
                  <div className="grupo-input">
                    <label htmlFor="tipo" className="rotulo">Tipo de Imóvel</label>
                    <select
                      id="tipo"
                      className="campo-digitacao campo-selecao"
                      required
                      disabled={bloqueadoPorAluguel}
                      value={dadosImovel.tipo}
                      onChange={lidarComMudanca}
                    >
                      <option value="" disabled>O que você está alugando?</option>
                      {TIPOS_IMOVEL.map((tipo) => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>

                  <div className="grupo-input">
                    <label htmlFor="status" className="rotulo">Status do Imóvel</label>
                    <select
                      id="status"
                      className="campo-digitacao campo-selecao"
                      required
                      disabled={bloqueadoPorAluguel}
                      value={dadosImovel.status}
                      onChange={lidarComMudanca}
                    >
                      <option value="" disabled>Qual o Status do Imóvel?</option>
                      {STATUS_IMOVEL.map((status) => (
                        <option key={status.valor} value={status.valor}>
                          {status.rotulo}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <footer className="rodape-modal">
                  <button
                    type="button"
                    className="botao-cancelar"
                    onClick={voltarParaDashboard}
                  >
                    Cancelar
                  </button>

                  {!bloqueadoPorAluguel && (
                    <button
                      type="submit"
                      className="botao-sucesso"
                      disabled={salvando}
                    >
                      {salvando
                        ? 'Salvando...'
                        : modoEdicao
                        ? 'Salvar Alterações'
                        : 'Salvar Imóvel'}
                    </button>
                  )}
                </footer>
              </form>
            )}
          </main>
        </div>
      </div>
    </>
  );
}

export default function CadastrarImovel() {
  return (
    <Suspense fallback={<div className="fundo-dashboard-falso" />}>
      <ConteudoCadastrarImovel />
    </Suspense>
  );
}