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
          <a href="#" className="item-menu">Cadastra-se</a>
          <a href="#" className="botao-login">Login</a>
        </nav>
      </header>

      <main>

        <section className="apresentacao">
          <div className="texto-apresentacao">
            <h1 className="titulo-principal">
              O aluguel do seu jeito
            </h1>
          </div>
        </section>
       
      </main>
    </>
  );
}