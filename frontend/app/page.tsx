export default function Homepage() {
  return (
    <>
      <header className="menu-topo">
        <div className="nome">
          <svg
            className="icone-logo"
            viewBox="0 0 120 120"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M18 40 V22 a4 4 0 0 1 4 -4 H40"
              stroke="#00D9B5"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M102 40 V22 a4 4 0 0 0 -4 -4 H80"
              stroke="#00D9B5"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M18 80 V98 a4 4 0 0 0 4 4 H40"
              stroke="#00D9B5"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M102 80 V98 a4 4 0 0 1 -4 4 H80"
              stroke="#00D9B5"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <circle cx="60" cy="52" r="14" fill="#00D9B5" />
            <path d="M60 64 L50 86 H70 Z" fill="#00D9B5" />
          </svg>
          <h3>Chaveo</h3>
        </div>

        <nav className="menu">
          <a href="#" className="item-menu">Como Funciona?</a>
          <a href="#" className="item-menu">Perguntas</a>
          <a href="#" className="item-menu">Cadastre-se</a>
          <a href="#" className="botao-login">Login</a>
        </nav>
      </header>

      <main>
        <section className="apresentacao">
          <div className="coluna-texto">
            <h1 className="titulo-principal">
              O aluguel do seu jeito,
              sem passar a chave
              pra <em>imobiliária</em>.
            </h1>

            <p className="texto-apoio">
              Chaveo gera o contrato, cobra o Pix, lembra o inquilino, tudo isso na palma da sua mão. 
              Sem comissão sobre o aluguel — só uma assinatura fixa, todo mês, do mesmo jeito.
            </p>

            <div className="botoes-acoes">
              <a href="#teste" className="btn-criar-conta">
                Criar minha conta
              </a>
              <a href="#como-funciona" className="btn-ver-funciona">
                Ver como funciona
              </a>
            </div>
          </div>

          <div className="coluna-ilustracao">
            <div className="brilho-fundo"></div>
            <div className="container-recibo">
              <div className="recibo-velho">
                <span className="etiqueta-recibo"> IMOBILIÀRIA</span>
                <span className="valor-riscado"> R$375 /<small>mês</small></span>
                <span className="subtexto-recibo"> 10% do aluguel</span>
                <span className="subtexto-recibo"> taxa de administração</span>
                <span className="subtexto-recibo"> descontado direto do aluguel</span>
                <span className="subtexto-recibo"> Reparos superfaturados com prestadores deles</span>
              </div>
              <div className="recibo-novo">
                <span className="etiqueta-recibo">CHAVEO</span>
                <span className="valor-destaque"> fixo /<small>mês</small></span>
                <span className="subtexto-recibo"> 100% do aluguel é seu</span>
                <span className="subtexto-recibo"> Cobrança e lembretes automáticos</span>
                <span className="subtexto-recibo"> Contato direto com o seu inquilino</span>
                <span className="subtexto-recibo"> Tudo reolvido pelo celular</span>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}