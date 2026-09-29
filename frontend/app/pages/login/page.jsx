export default function Home() {
  return (
    <main>
      <h1>Login</h1>

     <div className="grid grid-cols-2 grid-rows-6 gap-4">
    <div >CPF:</div>
    <div className="col-span-2 row-start-2"><input type="insira seu cpf..." /></div>
    <div className="row-start-3">Senha</div>
    <div className="col-span-2 row-start-4"><input type="insira sua senha" /></div>
    <div className="row-start-5">Lembrar Dados?</div>
    <div className="row-start-5">Esqueci Minha Senha</div>
    <div className="col-span-2">Entrar</div>
</div>
    </main>
  );
}