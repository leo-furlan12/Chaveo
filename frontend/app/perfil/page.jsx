"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, UserRound } from "lucide-react";
import { listarAreas } from "../components/TrocarPerfil";

const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/$/, "");
const classeCampo = "w-full rounded-lg border border-slate-700 bg-ink px-3 py-2 text-paper focus:border-teal disabled:cursor-not-allowed disabled:bg-slate-800/50 disabled:text-slate-400";
const estadosCivis = [
  ["SOLTEIRO", "Solteiro(a)"],
  ["CASADO", "Casado(a)"],
  ["DIVORCIADO", "Divorciado(a)"],
  ["VIUVO", "Viúvo(a)"],
  ["UNIAO_ESTAVEL", "União estável"],
];
const categorias = ["Eletricista", "Encanador", "Pintor", "Chaveiro", "Pedreiro", "Limpeza", "Vistoria", "Manutenção"];

function formatarCpf(valor) {
  return (valor ?? "").replace(/\D/g, "").replace(
    /^(\d{3})(\d{3})(\d{3})(\d{2})$/,
    "$1.$2.$3-$4",
  );
}

function digitosTelefone(valor) {
  const digitos = (valor ?? "").replace(/\D/g, "");
  return /^55\d{10,11}$/.test(digitos) ? digitos.slice(2) : digitos.slice(0, 11);
}

function formatarTelefone(valor) {
  const digitos = digitosTelefone(valor);
  if (digitos.length <= 2) return digitos;

  const ddd = digitos.slice(0, 2);
  const numero = digitos.slice(2);
  const prefixo = digitos.length === 11 ? 5 : 4;
  const formatado = numero.length > prefixo
    ? `${numero.slice(0, prefixo)}-${numero.slice(prefixo)}`
    : numero;

  return `(${ddd}) ${formatado}`;
}

function Campo({ titulo, ...atributos }) {
  return (
    <label className="grid content-start gap-2 text-sm text-slate-300">
      {titulo}
      <input className={classeCampo} {...atributos} />
    </label>
  );
}

export default function PerfilPage() {
  const router = useRouter();
  const [perfil, setPerfil] = useState(null);
  const [form, setForm] = useState(null);
  const [origem, setOrigem] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      router.replace("/login?redirect=%2Fperfil");
      return;
    }

    setOrigem(new URLSearchParams(window.location.search));
    const requisicao = new AbortController();
    fetch(`${apiUrl}/auth/meu-perfil`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: requisicao.signal,
      cache: "no-store",
    }).then(async (resposta) => {
      if (resposta.status === 401) {
        sessionStorage.removeItem("token");
        router.replace("/login?redirect=%2Fperfil");
        return;
      }
      if (!resposta.ok) throw new Error("Não foi possível carregar o perfil.");
      const dados = await resposta.json();
      setPerfil(dados);
      setForm(dados);
    }).catch(() => {
      if (!requisicao.signal.aborted) setErro("Não foi possível carregar o perfil.");
    });

    return () => requisicao.abort();
  }, [router]);

  const areas = listarAreas(perfil?.perfis);
  const contratoOrigem = origem?.get("contrato");
  const voltar = contratoOrigem && /^\d+$/.test(contratoOrigem) && areas.some(({ perfil }) => perfil === "INQUILINO")
    ? `/CompletarContrato?id=${encodeURIComponent(contratoOrigem)}`
    : areas.find(({ perfil }) => perfil === origem?.get("area"))?.href || areas[0]?.href || "/login";

  async function salvar(evento) {
    evento.preventDefault();
    setErro("");
    setSucesso("");
    const formulario = evento.currentTarget;
    const credenciais = new FormData(formulario);
    const senhaAtual = credenciais.get("senha_atual");
    const novaSenha = credenciais.get("nova_senha");
    const alteracoes = {};
    for (const campo of ["nome", "email", "telefone", "rg", "nacionalidade", "estado_civil", "profissao"]) {
      if (form[campo] !== perfil[campo]) alteracoes[campo] = form[campo];
    }
    if (form.prestador !== perfil.prestador) alteracoes.prestador = form.prestador;
    if (senhaAtual) alteracoes.senha_atual = senhaAtual;
    if (novaSenha) alteracoes.nova_senha = novaSenha;

    const token = sessionStorage.getItem("token");
    if (!token) {
      router.replace("/login?redirect=%2Fperfil");
      return;
    }

    setSalvando(true);
    try {
      const resposta = await fetch(`${apiUrl}/auth/meu-perfil`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(alteracoes),
      });
      if (resposta.status === 401) {
        sessionStorage.removeItem("token");
        router.replace("/login?redirect=%2Fperfil");
        return;
      }
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.message || "Não foi possível salvar o perfil.");
      formulario.reset();
      setPerfil(dados);
      setForm(dados);
      setSucesso("Perfil atualizado.");
    } catch (falha) {
      setErro(falha.message);
    } finally {
      setSalvando(false);
    }
  }

  function campoPessoal(campo) {
    return {
      value: form[campo] ?? "",
      onChange: (evento) => setForm({ ...form, [campo]: evento.target.value }),
    };
  }

  function campoPrestador(campo) {
    return {
      value: form.prestador[campo] ?? "",
      onChange: (evento) => {
        const valor = evento.target.value;
        setForm({ ...form, prestador: { ...form.prestador, [campo]: campo === "categoria_id" ? Number(valor) || null : valor } });
      },
    };
  }

  return (
    <main className="min-h-screen bg-ink px-4 py-8 text-paper sm:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <Link href={voltar} className="inline-flex items-center gap-2 text-sm text-teal">
          <ArrowLeft size={16} aria-hidden="true" />
          {contratoOrigem && voltar.startsWith("/CompletarContrato") ? "Voltar ao contrato" : "Voltar ao dashboard"}
        </Link>

        <header className="flex items-center gap-4 rounded-2xl border border-teal/25 bg-ink-soft p-5">
          <span className="rounded-xl bg-teal/15 p-3 text-teal"><UserRound aria-hidden="true" /></span>
          <div>
            <h1 className="text-2xl font-bold">Meu perfil</h1>
            {areas.length > 0 && <p className="mt-1 text-sm text-slate-300">{areas.map(({ nome }) => nome).join(" · ")}</p>}
          </div>
        </header>

        {erro && <p role="alert" className="rounded-lg border border-red-400/30 p-3 text-red-300">{erro}</p>}
        {sucesso && <p role="status" className="rounded-lg border border-teal/30 p-3 text-teal">{sucesso}</p>}
        {!form && !erro && <p role="status">Carregando perfil...</p>}

        {form && (
          <form onSubmit={salvar}>
            <fieldset disabled={salvando} className="space-y-5">
              <section className="rounded-xl border border-slate-700 bg-ink-soft p-5">
                <h2 className="mb-4 font-semibold">Dados pessoais</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo titulo="Nome" required minLength={3} maxLength={150} autoComplete="name" {...campoPessoal("nome")} />
                  <Campo titulo="CPF" disabled value={formatarCpf(perfil.cpf)} />
                  <Campo titulo="E-mail" type="email" required maxLength={255} autoComplete="email" {...campoPessoal("email")} />
                  <Campo
                    titulo="Telefone com DDD"
                    type="tel"
                    autoComplete="tel"
                    value={formatarTelefone(form.telefone)}
                    onChange={(evento) => setForm({ ...form, telefone: digitosTelefone(evento.target.value) })}
                  />
                  <Campo titulo="RG" maxLength={20} {...campoPessoal("rg")} />
                  <Campo titulo="Nacionalidade" maxLength={80} {...campoPessoal("nacionalidade")} />
                  <label className="grid gap-2 text-sm text-slate-300">
                    Estado civil
                    <select className={classeCampo} {...campoPessoal("estado_civil")}>
                      <option value="">Selecionar</option>
                      {estadosCivis.map(([valor, titulo]) => <option key={valor} value={valor}>{titulo}</option>)}
                    </select>
                  </label>
                  <Campo titulo="Profissão ou ocupação" maxLength={150} {...campoPessoal("profissao")} />
                </div>
              </section>

              {form.prestador && (
                <section className="rounded-xl border border-slate-700 bg-ink-soft p-5">
                  <h2 className="mb-4 font-semibold">Dados de prestação de serviço</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Campo titulo="Cidade" maxLength={100} {...campoPrestador("cidade")} />
                    <Campo titulo="UF" maxLength={2} {...campoPrestador("estado")} />
                    <label className="grid gap-2 text-sm text-slate-300">
                      Categoria principal
                      <select className={classeCampo} {...campoPrestador("categoria_id")}>
                        <option value="">Selecionar</option>
                        {categorias.map((nome, indice) => <option key={nome} value={indice + 1}>{nome}</option>)}
                      </select>
                    </label>
                    <label className="grid gap-2 text-sm text-slate-300 sm:col-span-2">
                      Resumo dos serviços
                      <textarea className={classeCampo} rows={3} maxLength={5000} {...campoPrestador("descricao")} />
                    </label>
                  </div>
                </section>
              )}

              <section className="rounded-xl border border-slate-700 bg-ink-soft p-5">
                <h2 className="mb-2 font-semibold">Segurança da conta</h2>
                <p className="mb-4 text-sm text-slate-300">Informe a senha atual para alterar o e-mail ou a senha.</p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Campo titulo="Senha atual" name="senha_atual" type="password" autoComplete="current-password" />
                  <Campo titulo="Nova senha" name="nova_senha" type="password" minLength={6} maxLength={72} autoComplete="new-password" />
                </div>
              </section>

              <div className="flex justify-center">
                <button type="submit" className="inline-flex items-center gap-2 rounded-xl bg-teal px-5 py-3 text-sm font-semibold text-ink disabled:opacity-60">
                  <Save size={17} aria-hidden="true" />
                  {salvando ? "Salvando..." : "Salvar alterações"}
                </button>
              </div>
            </fieldset>
          </form>
        )}
      </div>
    </main>
  );
}
