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

const URL_BASE_ASAAS = 'https://api-sandbox.asaas.com/v3';
const USER_AGENT_ASAAS = 'GestaoAluguelNext/1.0.0';

// Centraliza URL e headers exigidos pelo Asaas em todas as chamadas.
async function requisitarAsaas<T>(
  caminho: string,
  metodo: 'GET' | 'POST',
  dados?: unknown,
): Promise<T> {
  const chaveApi = process.env.ASAAS_API_KEY;

  if (!chaveApi) {
    throw new Error('A variável ASAAS_API_KEY não está configurada.');
  }

  const resposta = await fetch(`${URL_BASE_ASAAS}${caminho}`, {
    method: metodo,
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

    throw new Error(
      descricoes || `O Asaas respondeu com HTTP ${resposta.status}.`,
    );
  }

  return corpo as T;
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
