"use client"; 
import { useState } from 'react';
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


export default function CadastrarImovel(){
    
    //serve para guardar todas as informaçõs que usúario digitar
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





    // 1. Função que vai no ViaCEP buscar os dados na internet
  const buscarCep = async (cepDigitado) => {
    const cepNumeros = cepDigitado.replace(/\D/g, ''); // Limpa o tracinho para a API
    
    try {
      const resposta = await fetch(`https://viacep.com.br/ws/${cepNumeros}/json/`);
      const dados = await resposta.json();

      // Se o ViaCEP encontrou a rua, atualiza a memória de uma vez só!
      if (!dados.erro) {
        setDadosImovel((estadoAnterior) => ({
          ...estadoAnterior,
          logradouro: dados.logradouro,
          bairro: dados.bairro,
          cidade: dados.localidade, // O ViaCEP chama cidade de 'localidade'
          estado: dados.uf          // O ViaCEP chama estado de 'uf'
        }));
      }
    } catch (erro) {
      console.error("Erro ao buscar o CEP:", erro);
    }
  };

  // 2. Nossa função atualizada com máscara de CEP e o gatilho da busca
  const lidarComMudanca = (e) => {
    let { id, value } = e.target;

    // Máscara: Coloca o tracinho no CEP automaticamente (Ex: 87300-000)
    if (id === 'cep') {
      value = value.replace(/\D/g, ''); // Impede de digitar letras
      if (value.length > 5) {
        value = value.replace(/^(\d{5})(\d)/, '$1-$2'); // Bota o traço depois do 5º número
      }
    }

    // Salva na memória o que foi digitado
    setDadosImovel((estadoAnterior) => ({
      ...estadoAnterior,
      [id]: value
    }));

    // Se o campo for o CEP e bater 8 números, dispara a busca do ViaCEP!
    if (id === 'cep' && value.replace(/\D/g, '').length === 8) {
      buscarCep(value);
    }
  };

  // 3. Função que engatilha o salvamento final
  const lidarComEnvio = (e) => {
    e.preventDefault(); // Impede a página de recarregar (dar F5)
    
    // Aqui no futuro vai o fetch() enviando pro seu backend (Issue #32)
    console.log("🚀 Pacote pronto para o banco de dados:", dadosImovel);
    
    alert("Dados capturados com sucesso! Abra o console (F12) para ver o pacote JSON.");
  };
    


  return (
    <>
      <div className="fundo-dashboard-falso"></div>

      <div className="pelicula-escura">
        <div className="caixa-modal">
          
          <header className="cabecalho-modal">
            <h2 className="titulo-modal">Cadastrar Novo Imóvel</h2>
            <button className="botao-fechar" title="Fechar">X</button>
          </header>

          <main className="corpo-modal">
            <form id="formulario-imovel" onSubmit={lidarComEnvio}>
              
              <h3 className="titulo-secao">
                <img src="/icones-homepage/casa.svg" alt="Ícone Localização" className="icone-secao" />
                Localização
              </h3>
              
              <div className="grade-formulario">
                <div className="grupo-input">
                  <label htmlFor="cep" className="rotulo">CEP</label>
                  <input type="text" id="cep" className="campo-digitacao" placeholder="00000-000" maxLength="9" value={dadosImovel.cep} onChange={lidarComMudanca} />
                </div>
                
                <div className="grupo-input">
                  <label htmlFor="bairro" className="rotulo">Bairro</label>
                  <input type="text" id="bairro" className="campo-digitacao" placeholder="Ex: Centro" value={dadosImovel.bairro} onChange={lidarComMudanca}/>
                </div>

                <div className="grupo-input linha-inteira">
                  <label htmlFor="logradouro" className="rotulo">Logradouro (Rua, Avenida)</label>
                  <input type="text" id="logradouro" className="campo-digitacao" placeholder="Ex: Avenida Brasil" value={dadosImovel.logradouro} onChange={lidarComMudanca} />
                </div>

                <div className="grupo-input">
                  <label htmlFor="numero" className="rotulo">Número</label>
                  <input type="text" id="numero" className="campo-digitacao" placeholder="Ex: 1500 ou S/N" value={dadosImovel.numero} onChange={lidarComMudanca} />
                </div>

                <div className="grupo-input">
                  <label htmlFor="complemento" className="rotulo">
                    Complemento <span className="texto-opcional">(Opcional)</span>
                  </label>
                  <input type="text" id="complemento" className="campo-digitacao" placeholder="Ex: Apto 302, Bloco B" value={dadosImovel.complemento} onChange={lidarComMudanca} />
                </div>

                <div className="grupo-input">
                  <label htmlFor="cidade" className="rotulo">Cidade</label>
                  <input type="text" id="cidade" className="campo-digitacao" placeholder="Ex: Campo Mourão" value={dadosImovel.cidade} onChange={lidarComMudanca} />
                </div>

                <div className="grupo-input">
                    <label htmlFor="estado" className="rotulo">Estado</label>
                    <select 
                        id="estado" 
                        className="campo-digitacao campo-selecao" 
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
                <img src="/icones-homepage/contrato.svg" alt="Ícone Detalhes" className="icone-secao" />
                Detalhes do Imóvel
              </h3>
              
              <div className="grade-formulario sem-margem-fundo">


                <div className="grupo-input">
                    <label htmlFor="tipo" className="rotulo">Tipo de Imóvel</label>
                    <select 
                        id="tipo" 
                        className="campo-digitacao campo-selecao" 
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
                <button type="button" className="botao-cancelar">Cancelar</button>
                <button type="submit" className="botao-sucesso">Salvar Imóvel</button>
                </footer>

            </form>
          </main>

          

        </div>
      </div>
    </>
  );
}