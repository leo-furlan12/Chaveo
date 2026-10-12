import './style.css';

export default function CadastrarImovelModal() {
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
            <form id="formulario-imovel">
              
              <h3 className="titulo-secao">
                <img src="/icones-homepage/casa.svg" alt="Ícone Localização" className="icone-secao" />
                Localização
              </h3>
              
              <div className="grade-formulario">
                <div className="grupo-input">
                  <label htmlFor="cep" className="rotulo">CEP</label>
                  <input type="text" id="cep" className="campo-digitacao" placeholder="00000-000" maxLength="9" />
                </div>
                
                <div className="grupo-input">
                  <label htmlFor="bairro" className="rotulo">Bairro</label>
                  <input type="text" id="bairro" className="campo-digitacao" placeholder="Ex: Centro" />
                </div>

                <div className="grupo-input linha-inteira">
                  <label htmlFor="logradouro" className="rotulo">Logradouro (Rua, Avenida)</label>
                  <input type="text" id="logradouro" className="campo-digitacao" placeholder="Ex: Avenida Brasil" />
                </div>

                <div className="grupo-input">
                  <label htmlFor="numero" className="rotulo">Número</label>
                  <input type="text" id="numero" className="campo-digitacao" placeholder="Ex: 1500 ou S/N" />
                </div>

                <div className="grupo-input">
                  <label htmlFor="complemento" className="rotulo">
                    Complemento <span className="texto-opcional">(Opcional)</span>
                  </label>
                  <input type="text" id="complemento" className="campo-digitacao" placeholder="Ex: Apto 302, Bloco B" />
                </div>

                <div className="grupo-input">
                  <label htmlFor="cidade" className="rotulo">Cidade</label>
                  <input type="text" id="cidade" className="campo-digitacao" placeholder="Ex: Curitiba" />
                </div>

                <div className="grupo-input">
                  <label htmlFor="estado" className="rotulo">Estado</label>
                  <select id="estado" className="campo-digitacao campo-selecao" defaultValue="">
                    <option value="" disabled>Selecione o estado</option>
                    <option value="PR">Paraná (PR)</option>
                    <option value="SP">São Paulo (SP)</option>
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
                    <select id="tipo" className="campo-digitacao campo-selecao" defaultValue="">
                        <option value="" disabled>O que você está alugando?</option>
                        <option value="Casa">Casa</option>
                        <option value="Apartamento">Apartamento</option>
                        <option value="Sala Comercial">Sala Comercial</option>
                    </select>
                </div>
                <div className="grupo-input">
                    <label htmlFor="status" className="rotulo">Status do Imóvel</label>
                    <select id="status" className="campo-digitacao campo-selecao" defaultValue="">
                        <option value="" disabled>Qual o Status do Imóvel?</option>
                        <option value="Alugado">Alugado</option>
                        <option value="Disponível">Disponível</option>
                        <option value="Manutenção">Em Manutenção</option>
                        <option value="Inativo">Inativo</option>
                    </select>
                </div>

             </div>

            </form>
          </main>

          <footer className="rodape-modal">
            <button type="button" className="botao-cancelar">Cancelar</button>
            <button type="submit" form="formulario-imovel" className="botao-salvar">
              Salvar Imóvel
            </button>
          </footer>

        </div>
      </div>
    </>
  );
}