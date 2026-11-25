"use client";

export const DADOS_VAZIOS = {
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

export function montarDadosRecebimento(dados) {
  return dados.tipo === "PIX"
    ? { tipo: "PIX", pix: dados.pix }
    : { tipo: "CONTA_BANCARIA", contaBancaria: dados.contaBancaria };
}

function digitosCpf(chave) {
  return (chave ?? "").replace(/\D/g, "").slice(0, 11);
}

function formatarCpf(chave) {
  return digitosCpf(chave)
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3}\.\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3}\.\d{3}\.\d{3})(\d)/, "$1-$2");
}

export default function CamposRecebimento({ dados, setDados }) {
  const chaveCpf = dados.pix.tipoChave === "CPF";
  const atualizarPix = (campo, valor) => {
    setDados((atual) => ({ ...atual, pix: { ...atual.pix, [campo]: valor } }));
  };

  const atualizarConta = (campo, valor) => {
    setDados((atual) => ({
      ...atual,
      contaBancaria: { ...atual.contaBancaria, [campo]: valor },
    }));
  };

  return (
    <div className="space-y-4">
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
            <input
              id="chave-pix"
              required
              autoComplete="off"
              inputMode={chaveCpf ? "numeric" : undefined}
              value={chaveCpf ? formatarCpf(dados.pix.chave) : dados.pix.chave ?? ""}
              onChange={(evento) => atualizarPix(
                "chave",
                chaveCpf ? digitosCpf(evento.target.value) : evento.target.value,
              )}
              placeholder={chaveCpf ? "000.000.000-00" : "Informe a chave Pix"}
              className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#00D9B5]"
            />
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="banco" className="mb-2 block text-sm font-medium text-slate-200">Código do banco</label><input id="banco" required inputMode="numeric" maxLength={3} pattern="[0-9]{3}" value={dados.contaBancaria.codigoBanco} onChange={(evento) => atualizarConta("codigoBanco", evento.target.value.replace(/\D/g, ""))} placeholder="Ex.: 001" className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#00D9B5]" /></div>
          <div><label htmlFor="operacao" className="mb-2 block text-sm font-medium text-slate-200">Operação do repasse</label><select id="operacao" value={dados.contaBancaria.operacao} onChange={(evento) => atualizarConta("operacao", evento.target.value)} className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none focus:border-[#00D9B5]"><option value="PIX">Pix</option><option value="TED">Transferência (TED)</option></select></div>
          <div><label htmlFor="agencia" className="mb-2 block text-sm font-medium text-slate-200">Agência</label><input id="agencia" required value={dados.contaBancaria.agencia} onChange={(evento) => atualizarConta("agencia", evento.target.value)} className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none focus:border-[#00D9B5]" /></div>
          <div><label htmlFor="digito-agencia" className="mb-2 block text-sm font-medium text-slate-200">Dígito da agência <span className="text-slate-500">(opcional)</span></label><input id="digito-agencia" value={dados.contaBancaria.digitoAgencia ?? ""} onChange={(evento) => atualizarConta("digitoAgencia", evento.target.value)} className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none focus:border-[#00D9B5]" /></div>
          <div><label htmlFor="conta" className="mb-2 block text-sm font-medium text-slate-200">Número da conta</label><input id="conta" required value={dados.contaBancaria.conta} onChange={(evento) => atualizarConta("conta", evento.target.value)} className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none focus:border-[#00D9B5]" /></div>
          <div><label htmlFor="digito-conta" className="mb-2 block text-sm font-medium text-slate-200">Dígito da conta</label><input id="digito-conta" required value={dados.contaBancaria.digitoConta} onChange={(evento) => atualizarConta("digitoConta", evento.target.value)} className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none focus:border-[#00D9B5]" /></div>
          <div><label htmlFor="tipo-conta" className="mb-2 block text-sm font-medium text-slate-200">Tipo de conta</label><select id="tipo-conta" value={dados.contaBancaria.tipoConta} onChange={(evento) => atualizarConta("tipoConta", evento.target.value)} className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none focus:border-[#00D9B5]"><option value="CONTA_CORRENTE">Conta corrente</option><option value="CONTA_POUPANCA">Conta poupança</option></select></div>
          <div><label htmlFor="titular-nome" className="mb-2 block text-sm font-medium text-slate-200">Nome do titular</label><input id="titular-nome" required autoComplete="name" value={dados.contaBancaria.titularNome} onChange={(evento) => atualizarConta("titularNome", evento.target.value)} className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none focus:border-[#00D9B5]" /></div>
          <div className="sm:col-span-2"><label htmlFor="titular-documento" className="mb-2 block text-sm font-medium text-slate-200">CPF ou CNPJ do titular</label><input id="titular-documento" required inputMode="numeric" autoComplete="off" value={dados.contaBancaria.titularDocumento} onChange={(evento) => atualizarConta("titularDocumento", evento.target.value)} placeholder="Somente números ou documento formatado" className="w-full rounded-lg border border-slate-700 bg-[#14171F] px-3 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-[#00D9B5]" /></div>
        </div>
      )}
    </div>
  );
}
