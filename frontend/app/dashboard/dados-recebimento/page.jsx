"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, Landmark, Wallet } from "lucide-react";

const DADOS_VAZIOS = {
  tipo: "PIX",
  pix: { chave: "", tipoChave: "CPF" },
  contaBancaria: {
    codigoBanco: "",
    agencia: "",
    digitoAgencia: "",
    conta: "",
    digitoConta: "",
    tipoConta: "CONTA_CORRENTE",
    operacao: "PIX",
    titularNome: "",
    titularDocumento: "",
  },
};

function ocultarValor(valor, quantidadeVisivel = 4) {
  if (!valor) return "Não informado";
  const texto = String(valor);
  if (texto.length <= quantidadeVisivel) return "•".repeat(texto.length);
  return `${"•".repeat(Math.min(texto.length - quantidadeVisivel, 8))}${texto.slice(-quantidadeVisivel)}`;
}

function mascararChavePix(chave, tipoChave) {
  if (!chave) return "Não informada";
  if (tipoChave === "EMAIL") {
    const [usuario, dominio] = chave.split("@");
    return usuario && dominio
      ? `${usuario.slice(0, 1)}•••@${dominio}`
      : ocultarValor(chave);
  }
  return ocultarValor(chave);
}

export default function DadosRecebimentoPage() {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api").replace(/\/$/, "");
  const [dados, setDados] = useState(DADOS_VAZIOS);
  const [temCadastro, setTemCadastro] = useState(false);
  const [editando, setEditando] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [tipoMensagem, setTipoMensagem] = useState("erro");
  const [semSessao, setSemSessao] = useState(false);

  const carregarDados = useCallback(async () => {
    const token = sessionStorage.getItem("token");
    if (!token) {
      setSemSessao(true);
      setCarregando(false);
      return;
    }

    try {
      const resposta = await fetch(`${apiUrl}/proprietarios/recebimento`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const retorno = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        throw new Error(retorno.message || "Não foi possível carregar os dados de recebimento.");
      }

      const cadastrado = retorno.tipo === "PIX" || retorno.tipo === "CONTA_BANCARIA";
      const dadosCarregados = {
        ...DADOS_VAZIOS,
        tipo: cadastrado ? retorno.tipo : "PIX",
        pix: { ...DADOS_VAZIOS.pix, ...(retorno.pix || {}) },
        contaBancaria: { ...DADOS_VAZIOS.contaBancaria, ...(retorno.contaBancaria || {}) },
      };
      setDados(dadosCarregados);
      setTemCadastro(cadastrado);
      setEditando(!cadastrado);
      setMensagem("");
    } catch (erro) {
      setMensagem(erro.message || "Erro ao carregar os dados.");
      setTipoMensagem("erro");
    } finally {
      setCarregando(false);
    }
  }, [apiUrl]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const atualizarPix = (campo, valor) => {
    setDados((atual) => ({ ...atual, pix: { ...atual.pix, [campo]: valor } }));
  };

  const atualizarConta = (campo, valor) => {
    setDados((atual) => ({
      ...atual,
      contaBancaria: { ...atual.contaBancaria, [campo]: valor },
    }));
  };

  const salvarDados = async (evento) => {
    evento.preventDefault();
    setMensagem("");
    setSalvando(true);
    try {
      const token = sessionStorage.getItem("token");
      if (!token) {
        setSemSessao(true);
        throw new Error("Sua sessão expirou. Entre novamente para continuar.");
      }

      const payload = dados.tipo === "PIX"
        ? { tipo: "PIX", pix: dados.pix }
        : { tipo: "CONTA_BANCARIA", contaBancaria: dados.contaBancaria };
      const resposta = await fetch(`${apiUrl}/proprietarios/recebimento`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const retorno = await resposta.json().catch(() => ({}));
      if (!resposta.ok) {
        const detalhe = Array.isArray(retorno.message) ? retorno.message.join(" ") : retorno.message;
        throw new Error(detalhe || "Não foi possível salvar os dados bancários.");
      }

      setDados((atual) => ({
        ...atual,
        tipo: retorno.tipo,
        pix: { ...atual.pix, ...(retorno.pix || {}) },
        contaBancaria: { ...atual.contaBancaria, ...(retorno.contaBancaria || {}) },
      }));
      setTemCadastro(true);
      setEditando(false);
      setTipoMensagem("sucesso");
      setMensagem("Dados de recebimento salvos com sucesso.");
    } catch (erro) {
      setTipoMensagem("erro");
      setMensagem(erro.message || "Erro ao salvar os dados.");
    } finally {
      setSalvando(false);
    }
  };

  const cancelarEdicao = () => {
    setMensagem("");
    if (temCadastro) {
      carregarDados();
      setEditando(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#14171F] px-4 py-8 text-slate-100 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <Link href="/dashboard" className="mb-8 inline-flex items-center gap-2 text-sm text-slate-400 transition hover:text-[#00D9B5]">
          <ArrowLeft size={17} /> Voltar ao dashboard
        </Link>

        <header className="mb-8">
          <div className="mb-3 flex items-center gap-3 text-[#00D9B5]">
            <Landmark size={24} />
            <span className="text-xs font-semibold uppercase tracking-[0.2em]">Recebimentos</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Dados bancários</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
            Cadastre um único destino para receber os repasses dos aluguéis. Você pode alterar esse cadastro quando precisar.
          </p>
        </header>

        {mensagem && (
          <div role={tipoMensagem === "erro" ? "alert" : "status"} className={`mb-6 rounded-xl border px-4 py-3 text-sm ${tipoMensagem === "erro" ? "border-rose-500/40 bg-rose-500/10 text-rose-300" : "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"}`}>
            {mensagem}
          </div>
        )}

        {semSessao ? (
          <section className="rounded-2xl border border-slate-800 bg-[#1A1E29] p-6">
            <p className="mb-4 text-slate-300">Entre na sua conta de proprietário para consultar ou cadastrar o destino de recebimento.</p>
            <Link href="/login?redirect=/dashboard/dados-recebimento" className="inline-flex rounded-lg bg-[#00D9B5] px-4 py-2.5 text-sm font-bold text-[#14171F]">Entrar</Link>
          </section>
        ) : carregando ? (
          <div className="rounded-2xl border border-slate-800 bg-[#1A1E29] p-8 text-center text-sm text-slate-400">Carregando seus dados...</div>
        ) : temCadastro && !editando ? (
          <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#1A1E29] shadow-xl">
            <div className="flex flex-col gap-4 border-b border-slate-800 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="rounded-xl bg-[#00D9B5]/10 p-3 text-[#00D9B5]">{dados.tipo === "PIX" ? <Wallet size={22} /> : <Landmark size={22} />}</span>
                <div>
                  <h2 className="font-semibold text-white">Destino cadastrado</h2>
                  <p className="mt-1 text-xs text-slate-400">{dados.tipo === "PIX" ? "Chave Pix" : "Conta bancária"}</p>
                </div>
              </div>
              <button type="button" onClick={() => { setMensagem(""); setEditando(true); }} className="rounded-lg border border-[#00D9B5]/40 px-4 py-2.5 text-sm font-semibold text-[#00D9B5] transition hover:bg-[#00D9B5]/10">Alterar dados</button>
            </div>

            <dl className="grid gap-5 p-6 sm:grid-cols-2">
              {dados.tipo === "PIX" ? (
                <>
                  <div><dt className="text-xs text-slate-400">Tipo de chave</dt><dd className="mt-1 font-medium text-white">{dados.pix.tipoChave}</dd></div>
                  <div><dt className="text-xs text-slate-400">Chave Pix</dt><dd className="mt-1 break-all font-medium text-white">{mascararChavePix(dados.pix.chave, dados.pix.tipoChave)}</dd></div>
                </>
              ) : (
                <>
                  <div><dt className="text-xs text-slate-400">Banco</dt><dd className="mt-1 font-medium text-white">{dados.contaBancaria.codigoBanco}</dd></div>
                  <div><dt className="text-xs text-slate-400">Agência</dt><dd className="mt-1 font-medium text-white">{ocultarValor(`${dados.contaBancaria.agencia}${dados.contaBancaria.digitoAgencia ? `-${dados.contaBancaria.digitoAgencia}` : ""}`)}</dd></div>
                  <div><dt className="text-xs text-slate-400">Conta</dt><dd className="mt-1 font-medium text-white">{ocultarValor(`${dados.contaBancaria.conta}-${dados.contaBancaria.digitoConta}`)}</dd></div>
                  <div><dt className="text-xs text-slate-400">Tipo / operação</dt><dd className="mt-1 font-medium text-white">{dados.contaBancaria.tipoConta === "CONTA_POUPANCA" ? "Poupança" : "Corrente"} · {dados.contaBancaria.operacao}</dd></div>
                  <div><dt className="text-xs text-slate-400">Titular</dt><dd className="mt-1 font-medium text-white">{dados.contaBancaria.titularNome}</dd></div>
                  <div><dt className="text-xs text-slate-400">CPF/CNPJ do titular</dt><dd className="mt-1 font-medium text-white">{ocultarValor(dados.contaBancaria.titularDocumento)}</dd></div>
                </>
              )}
            </dl>
          </section>
        ) : (
          <form onSubmit={salvarDados} className="space-y-6 rounded-2xl border border-slate-800 bg-[#1A1E29] p-5 shadow-xl sm:p-8">
            <div>
              <label htmlFor="tipo-destino" className="mb-2 block text-sm font-medium text-slate-200">Como deseja receber?</label>
              <select id="tipo-destino" value={dados.tipo} onChange={(evento) => setDados((atual) => ({ ...atual, tipo: evento.target.value }))} className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none focus:border-[#00D9B5]">
                <option value="PIX">Chave Pix</option>
                <option value="CONTA_BANCARIA">Conta bancária</option>
              </select>
            </div>

            {dados.tipo === "PIX" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="tipo-chave-pix" className="mb-2 block text-sm font-medium text-slate-200">Tipo da chave</label>
                  <select id="tipo-chave-pix" value={dados.pix.tipoChave} onChange={(evento) => atualizarPix("tipoChave", evento.target.value)} className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none focus:border-[#00D9B5]">
                    <option value="CPF">CPF</option><option value="CNPJ">CNPJ</option><option value="EMAIL">E-mail</option><option value="PHONE">Telefone</option><option value="EVP">Aleatória (EVP)</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="chave-pix" className="mb-2 block text-sm font-medium text-slate-200">Chave Pix</label>
                  <input id="chave-pix" required autoComplete="off" value={dados.pix.chave} onChange={(evento) => atualizarPix("chave", evento.target.value)} placeholder="Informe a chave Pix" className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#00D9B5]" />
                </div>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="banco" className="mb-2 block text-sm font-medium text-slate-200">Código do banco</label><input id="banco" required inputMode="numeric" maxLength={3} pattern="[0-9]{3}" value={dados.contaBancaria.codigoBanco} onChange={(evento) => atualizarConta("codigoBanco", evento.target.value.replace(/\D/g, ""))} placeholder="Ex.: 001" className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#00D9B5]" /></div>
                <div><label htmlFor="operacao" className="mb-2 block text-sm font-medium text-slate-200">Operação do repasse</label><select id="operacao" value={dados.contaBancaria.operacao} onChange={(evento) => atualizarConta("operacao", evento.target.value)} className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none focus:border-[#00D9B5]"><option value="PIX">Pix</option><option value="TED">Transferência (TED)</option></select></div>
                <div><label htmlFor="agencia" className="mb-2 block text-sm font-medium text-slate-200">Agência</label><input id="agencia" required value={dados.contaBancaria.agencia} onChange={(evento) => atualizarConta("agencia", evento.target.value)} className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none focus:border-[#00D9B5]" /></div>
                <div><label htmlFor="digito-agencia" className="mb-2 block text-sm font-medium text-slate-200">Dígito da agência <span className="text-slate-500">(opcional)</span></label><input id="digito-agencia" value={dados.contaBancaria.digitoAgencia} onChange={(evento) => atualizarConta("digitoAgencia", evento.target.value)} className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none focus:border-[#00D9B5]" /></div>
                <div><label htmlFor="conta" className="mb-2 block text-sm font-medium text-slate-200">Número da conta</label><input id="conta" required value={dados.contaBancaria.conta} onChange={(evento) => atualizarConta("conta", evento.target.value)} className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none focus:border-[#00D9B5]" /></div>
                <div><label htmlFor="digito-conta" className="mb-2 block text-sm font-medium text-slate-200">Dígito da conta</label><input id="digito-conta" required value={dados.contaBancaria.digitoConta} onChange={(evento) => atualizarConta("digitoConta", evento.target.value)} className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none focus:border-[#00D9B5]" /></div>
                <div><label htmlFor="tipo-conta" className="mb-2 block text-sm font-medium text-slate-200">Tipo de conta</label><select id="tipo-conta" value={dados.contaBancaria.tipoConta} onChange={(evento) => atualizarConta("tipoConta", evento.target.value)} className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none focus:border-[#00D9B5]"><option value="CONTA_CORRENTE">Conta corrente</option><option value="CONTA_POUPANCA">Conta poupança</option></select></div>
                <div><label htmlFor="titular-nome" className="mb-2 block text-sm font-medium text-slate-200">Nome do titular</label><input id="titular-nome" required autoComplete="name" value={dados.contaBancaria.titularNome} onChange={(evento) => atualizarConta("titularNome", evento.target.value)} className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none focus:border-[#00D9B5]" /></div>
                <div className="sm:col-span-2"><label htmlFor="titular-documento" className="mb-2 block text-sm font-medium text-slate-200">CPF ou CNPJ do titular</label><input id="titular-documento" required inputMode="numeric" autoComplete="off" value={dados.contaBancaria.titularDocumento} onChange={(evento) => atualizarConta("titularDocumento", evento.target.value)} placeholder="Somente números ou documento formatado" className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#00D9B5]" /></div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 border-t border-slate-800 pt-5 sm:flex-row sm:justify-end">
              {temCadastro && <button type="button" onClick={cancelarEdicao} disabled={salvando} className="rounded-lg border border-slate-700 px-4 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-50">Cancelar</button>}
              <button type="submit" disabled={salvando} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#00D9B5] px-5 py-2.5 text-sm font-bold text-[#14171F] transition hover:bg-[#00c2a2] disabled:cursor-wait disabled:opacity-60">
                {temCadastro ? <CheckCircle2 size={17} /> : <Wallet size={17} />}
                {salvando ? "Salvando..." : temCadastro ? "Salvar alterações" : "Cadastrar destino"}
              </button>
            </div>
          </form>
        )}

        <p className="mt-5 text-xs leading-5 text-slate-500">Seus dados de recebimento são associados à sua conta de proprietário e usados para direcionar os repasses dos aluguéis.</p>
      </div>
    </main>
  );
}
