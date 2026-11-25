// Tipos mínimos das respostas usadas nesta etapa para evitar dependência de SDK.
export interface ClienteAsaasResposta {
  id: string;
}

export interface AssinaturaAsaasResposta {
  id: string;
  status?: string;
}

export interface PagamentoAsaas {
  id: string;
  status?: string;
  value: number;
  dueDate: string;
  bankSlipUrl?: string | null;
  transactionReceiptUrl?: string | null;
  confirmedDate?: string | null;
  paymentDate?: string | null;
  receivedAt?: string | null;
}

export interface ListaPagamentosAsaasResposta {
  data: PagamentoAsaas[];
}

export interface PixAsaasResposta {
  payload?: string | null;
  encodedImage?: string | null;
  expirationDate?: string | null;
}

export interface TransferenciaAsaasResposta {
  id: string;
  status?: string;
  externalReference?: string;
  value?: number;
  failReason?: string | null;
}

export class ErroRequisicaoAsaas extends Error {
  constructor(
    mensagem: string,
    readonly statusHttp: number,
  ) {
    super(mensagem);
    this.name = 'ErroRequisicaoAsaas';
  }
}

const URL_BASE_ASAAS = 'https://api-sandbox.asaas.com/v3';
const USER_AGENT_ASAAS = 'GestaoAluguelNext/1.0.0';

// Centraliza URL e headers exigidos pelo Asaas em todas as chamadas.
async function requisitarAsaas<T>(
  caminho: string,
  metodo: 'GET' | 'POST',
  dados?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const chaveApi = process.env.ASAAS_API_KEY;

  if (!chaveApi) {
    throw new Error('A variável ASAAS_API_KEY não está configurada.');
  }

  const resposta = await fetch(`${URL_BASE_ASAAS}${caminho}`, {
    method: metodo,
    signal,
    headers: {
      access_token: chaveApi,
      'Content-Type': 'application/json',
      'User-Agent': USER_AGENT_ASAAS,
    },
    ...(dados === undefined ? {} : { body: JSON.stringify(dados) }),
  });

  const corpo = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    const descricoes = Array.isArray(corpo?.errors)
      ? corpo.errors
          .map((erro: { description?: string }) => erro.description)
          .filter(Boolean)
          .join('; ')
      : '';

    throw new ErroRequisicaoAsaas(
      descricoes || `O Asaas respondeu com HTTP ${resposta.status}.`,
      resposta.status,
    );
  }

  return corpo as T;
}

export function consultarTransferenciaAsaas(id: string) {
  return requisitarAsaas<TransferenciaAsaasResposta>(
    `/transfers/${encodeURIComponent(id)}`,
    'GET',
    undefined,
    AbortSignal.timeout(5000),
  );
}

// Envia um repasse do saldo disponível da conta Asaas para uma chave Pix ou conta bancária.
export function criarTransferenciaAsaas(dados: {
  valor: number;
  referenciaExterna: string;
  destino:
    | { tipo: 'PIX'; chave: string; tipoChave: string }
    | {
        tipo: 'CONTA_BANCARIA';
        codigoBanco: string;
        titularNome: string;
        titularDocumento: string;
        agencia: string;
        digitoAgencia?: string;
        conta: string;
        digitoConta: string;
        tipoConta: string;
        operacao: 'PIX' | 'TED';
      };
}): Promise<TransferenciaAsaasResposta> {
  const base = {
    value: dados.valor,
    externalReference: dados.referenciaExterna,
    description: `Repasse de aluguel - ${dados.referenciaExterna}`,
  };

  if (dados.destino.tipo === 'PIX') {
    return requisitarAsaas<TransferenciaAsaasResposta>('/transfers', 'POST', {
      ...base,
      operationType: 'PIX',
      pixAddressKey: dados.destino.chave,
      pixAddressKeyType: dados.destino.tipoChave,
    });
  }

  return requisitarAsaas<TransferenciaAsaasResposta>('/transfers', 'POST', {
    ...base,
    operationType: dados.destino.operacao,
    bankAccount: {
      bank: { code: dados.destino.codigoBanco },
      ownerName: dados.destino.titularNome,
      cpfCnpj: dados.destino.titularDocumento,
      agency: dados.destino.agencia,
      ...(dados.destino.digitoAgencia
        ? { agencyDigit: dados.destino.digitoAgencia }
        : {}),
      account: dados.destino.conta,
      accountDigit: dados.destino.digitoConta,
      bankAccountType: dados.destino.tipoConta,
    },
  });
}

// Cadastra o inquilino como cliente pagador no Asaas.
export function criarClienteAsaas(dados: {
  nome: string;
  cpf: string;
  email: string;
  telefone?: string | null;
  referenciaExterna: string;
}): Promise<ClienteAsaasResposta> {
  return requisitarAsaas<ClienteAsaasResposta>('/customers', 'POST', {
    name: dados.nome,
    cpfCnpj: dados.cpf,
    email: dados.email,
    ...(dados.telefone ? { mobilePhone: dados.telefone } : {}),
    externalReference: dados.referenciaExterna,
  });
}

// Cria a recorrência mensal em boleto, com multa e juros percentuais.
export function criarAssinaturaAsaas(dados: {
  clienteAsaasId: string;
  valor: number;
  primeiroVencimento: string;
  ultimoVencimento: string;
  referenciaExterna: string;
}): Promise<AssinaturaAsaasResposta> {
  return requisitarAsaas<AssinaturaAsaasResposta>('/subscriptions', 'POST', {
    customer: dados.clienteAsaasId,
    billingType: 'BOLETO',
    value: dados.valor,
    cycle: 'MONTHLY',
    nextDueDate: dados.primeiroVencimento,
    endDate: dados.ultimoVencimento,
    fine: { value: 2, type: 'PERCENTAGE' },
    interest: { value: 1, type: 'PERCENTAGE' },
    externalReference: dados.referenciaExterna,
    description: `Aluguel do contrato ${dados.referenciaExterna}`,
  });
}

// Consulta uma única vez os pagamentos já emitidos para localizar a primeira fatura.
export function listarPagamentosAssinaturaAsaas(
  assinaturaId: string,
): Promise<ListaPagamentosAsaasResposta> {
  return requisitarAsaas<ListaPagamentosAsaasResposta>(
    `/subscriptions/${encodeURIComponent(assinaturaId)}/payments`,
    'GET',
  );
}

// Recupera boleto híbrido e Pix; somente o payload será persistido no banco.
export function buscarPixPagamentoAsaas(
  pagamentoId: string,
): Promise<PixAsaasResposta> {
  return requisitarAsaas<PixAsaasResposta>(
    `/payments/${encodeURIComponent(pagamentoId)}/pixQrCode`,
    'GET',
  );
}
