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

        <section className="secao-azul">
          <div className="wrap">
            <div className="cartao-branco">
              <div className="lado-esquerdo">

                <div className="selo-verde">
                  <span className="text-[#00D9B5]"></span> dentro da lei
                </div>
                <h2 className="titulo-cartao"> Isso é regularizado??</h2>
                <p className="texto-cartao"> Sim. A Lei do Inquilinato (8.245/91) nunca exigiu um corretor no meio — proprietário e inquilino sempre puderam fechar o contrato direto.</p>
                <p className="texto-cartao"> Chaveo automatiza o que já era administrativo: gerar contrato, cobrar e calcular imposto. Quem escolhe o inquilino é você, fora do app.</p>
              </div>

              <div className="lado-direito">
                <div className="item-lista">
                  <div className="numero">01</div>
                  <div className="conteudo-item">
                    <h4 className="titulo-item">Sem Captação, sem intermediação</h4>
                    <p className="desc-item"> O app não anuncia o imóvel nem indica inquilino — por isso fica fora do escopo da corretagem regulada pela Lei 6.530/78.</p>
                  </div>
                </div>

                <div className="item-lista">
                  <div className="numero">02</div>
                  <div className="conteudo-item">
                    <h4 className="titulo-item">Assinatura eletrônica com validade legal</h4>
                    <p className="desc-item">
                      Reconhecida pelas Leis 14.063/2020 e 14.620/2023 — o mesmo contrato que valeria em papel, só que mais rápido.
                    </p>
                  </div>
                </div>


                <div className="item-lista border-none">
                  <div className="numero">03</div>
                  <div className="conteudo-item">
                    <h4 className="titulo-item">Pix processado por instituição licenciada</h4>
                    <p className="desc-item">
                       A cobrança recorrente passa por um parceiro de pagamento autorizado pelo Banco Central — o Chaveo nunca guarda seu dinheiro.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          </div>

        </section>

      </main>
    </>
  );
}