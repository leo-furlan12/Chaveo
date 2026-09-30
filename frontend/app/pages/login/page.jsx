import Logo from "../../components/Logo";
import Checkbox from "../../components/Checkbox";
import Button from "./Button";
export default function Login() {
  return (
    <main className="min-h-screen  bg-linear-to-b  from-ink from-60% to-ink-soft text-paper flex flex-col">
      <header>
        <div>
          <div className="p-8 ">
            <Logo />
          </div>
        </div>
      </header>

      <section className="flex-1 flex content-center justify-center ">
        <div className="">
          <div className="text-center">
            <div className="p-8 flex justify-center">
              <div className="p-8 flex justify-center">
                <Logo tamanho="!w-20 !h-20" />
              </div>
            </div>

            <h1 className="font-display text-4xl">Login</h1>
          </div>

          <section className="grid grid-cols-2  gap-4 font-[family-name:var(--font-jetbrains-mono)]">
            <div>CPF:</div>
            <div className="col-span-2 row-start-2">
              {" "}
              <input
                type="text"
                className="bg-slate/10 p-3 rounded-lg w-full h-10"
                placeholder="Insira seu CPF"
              />
            </div>

            <div className="col-span-2 row-start-3 ">Senha:</div>
            <div className="col-span-2 row-start-4">
              {" "}
              <input
                className="bg-slate/10 rounded-lg w-full p-3 h-10 "
                type="password"
                placeholder="Insira sua senha"
              />
            </div>
            <div className="row-start-5 text-teal ">
              <Checkbox texto="Lembrar Dados?"></Checkbox>
            </div>
            <div
              className="row-start-5 text-teal  content-center text-right
"
            >
              {" "}
              Esqueci Senha
            </div>
            <div className="col-span-2 text-center">
              <Button texto="Entrar"></Button>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
