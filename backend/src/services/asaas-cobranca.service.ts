import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Contrato } from '../database/entities/contrato.entity';
import { Fatura } from '../database/entities/fatura.entity';
import { Usuario } from '../database/entities/usuario.entity';
import {
  buscarPixPagamentoAsaas,
  criarClienteAsaas,
  criarAssinaturaAsaas,
  listarPagamentosAssinaturaAsaas,
  PagamentoAsaas,
} from '../lib/asaas';

@Injectable()
export class AsaasCobrancaService {
  constructor(
    @InjectRepository(Contrato)
    private readonly contratoRepository: Repository<Contrato>,
    @InjectRepository(Fatura)
    private readonly faturaRepository: Repository<Fatura>,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  async listarBoletosDoInquilino(usuarioId: string) {
    const faturas = await this.faturaRepository.find({
      where: { locatario_id: usuarioId, asaas_payment_id: Not(IsNull()) },
      relations: { imovel: true },
      order: { data_vencimento: 'DESC', id: 'DESC' },
    });

    return faturas.map((fatura) => ({
      id: fatura.id,
      status: fatura.status,
      pago: fatura.pago,
      valor: fatura.valor,
      data_vencimento: fatura.data_vencimento,
      data_pagamento: fatura.data_pagamento,
      registrado_em: fatura.criado_em,
      imovel: fatura.imovel ? {
        logradouro: fatura.imovel.logradouro,
        numero: fatura.imovel.numero,
      } : null,
    }));
  }

  // Lista somente as faturas do contrato pertencente ao inquilino autenticado.
  async listarFaturasDoContrato(contratoId: string, usuarioId: string) {
    const contrato = await this.buscarContratoDoInquilino(contratoId, usuarioId);
    const comprovantesPorPagamento = new Map<string, string>();

    // Confere o estado atual diretamente no Asaas para não depender apenas do webhook.
    if (contrato.asaas_subscription_id) {
      try {
        const pagamentos = await listarPagamentosAssinaturaAsaas(
          contrato.asaas_subscription_id,
        );
        for (const pagamento of pagamentos.data ?? []) {
          if (pagamento.id && pagamento.dueDate) {
            await this.salvarPagamentoComoFatura(contrato, pagamento);
            if (pagamento.transactionReceiptUrl) {
              comprovantesPorPagamento.set(
                pagamento.id,
                pagamento.transactionReceiptUrl,
              );
            }
          }
        }
      } catch (erro) {
        throw new BadGatewayException(
          erro instanceof Error
            ? `Não foi possível sincronizar as cobranças com o Asaas: ${erro.message}`
            : 'Não foi possível sincronizar as cobranças com o Asaas.',
        );
      }
    }

    const faturas = await this.faturaRepository.find({
      where: { contrato_id: contratoId, locatario_id: usuarioId },
      order: { data_vencimento: 'DESC', id: 'DESC' },
    });

    // A URL do comprovante é retornada pelo Asaas e não precisa ser persistida no banco.
    return faturas.map((fatura) => ({
      ...fatura,
      comprovante_url: fatura.asaas_payment_id
        ? comprovantesPorPagamento.get(fatura.asaas_payment_id) ?? null
        : null,
    }));
  }

  // Cria ou reutiliza cliente e assinatura, e registra a primeira cobrança emitida.
  async gerarCobranca(contratoId: string, usuarioId: string) {
    const contrato = await this.buscarContratoDoInquilino(contratoId, usuarioId);
    if (contrato.status !== 'CONCLUIDO') {
      throw new BadRequestException(
        'A cobrança só pode ser gerada após a conclusão do contrato.',
      );
    }
        const inquilino = contrato.locatario;

    if (
      !inquilino ||
      !contrato.imovel_id ||
      !contrato.locador_id ||
      !contrato.valor_aluguel ||
      !contrato.data_inicio ||
      !contrato.data_fim ||
      !contrato.dia_vencimento
    ) {
      throw new BadRequestException(
        'O contrato ainda não possui todos os dados necessários para cobrança.',
      );
    }

    const valor = Number(contrato.valor_aluguel);
    if (!Number.isFinite(valor) || valor <= 0) {
      throw new BadRequestException('O valor do aluguel do contrato é inválido.');
    }

    let primeiroVencimento: string;
    try {
      primeiroVencimento = this.calcularPrimeiroVencimento(contrato);
    } catch (erro) {
      if (erro instanceof BadRequestException) throw erro;
      throw new BadRequestException('As datas do contrato são inválidas.');
    }

    try {
      // Reutiliza o cliente gravado no inquilino para não duplicá-lo no Asaas.
      if (!inquilino.asaas_customer_id) {
        const cliente = await criarClienteAsaas({
          nome: inquilino.nome,
          cpf: inquilino.cpf,
          email: inquilino.email,
          telefone: inquilino.telefone,
          referenciaExterna: `inquilino-${inquilino.id}`,
        });
        inquilino.asaas_customer_id = cliente.id;
        await this.usuarioRepository.save(inquilino);
      }

      // Uma chamada repetida consulta a assinatura existente em vez de criar outra.
      if (!contrato.asaas_subscription_id) {
        const assinatura = await criarAssinaturaAsaas({
          clienteAsaasId: inquilino.asaas_customer_id,
          valor,
          primeiroVencimento,
          ultimoVencimento: contrato.data_fim,
          referenciaExterna: `contrato-${contrato.id}`,
        });
        contrato.asaas_subscription_id = assinatura.id;
        contrato.asaas_subscription_status = assinatura.status ?? 'ACTIVE';
        await this.contratoRepository.save(contrato);
      }

      const pagamentos = await listarPagamentosAssinaturaAsaas(
        contrato.asaas_subscription_id,
      );
      const primeiroPagamento = [...(pagamentos.data ?? [])].sort((a, b) =>
        a.dueDate.localeCompare(b.dueDate),
      )[0];

      if (!primeiroPagamento) {
        return {
          mensagem:
            'A assinatura foi criada. A primeira cobrança ainda está sendo processada pelo Asaas.',
          fatura: null,
        };
      }

      const fatura = await this.salvarPagamentoComoFatura(contrato, primeiroPagamento);
      return {
        mensagem: 'Cobrança consultada com sucesso.',
        fatura,
      };
    } catch (erro) {
      if (
        erro instanceof BadRequestException ||
        erro instanceof ForbiddenException ||
        erro instanceof NotFoundException
      ) {
        throw erro;
      }
      throw new BadGatewayException(
        erro instanceof Error ? erro.message : 'Não foi possível comunicar com o Asaas.',
      );
    }
  }

  // Busca a imagem do QR sob demanda e salva apenas o Pix copia e cola no banco.
  async buscarPixDaFatura(
    contratoId: string,
    faturaId: string,
    usuarioId: string,
  ) {
    await this.buscarContratoDoInquilino(contratoId, usuarioId);

    const fatura = await this.faturaRepository.findOne({
      where: {
        id: faturaId,
        contrato_id: contratoId,
        locatario_id: usuarioId,
      },
    });

    if (!fatura) throw new NotFoundException('Fatura não encontrada.');
    if (!fatura.asaas_payment_id) {
      throw new BadRequestException('A cobrança ainda não foi emitida pelo Asaas.');
    }

    try {
      const pix = await buscarPixPagamentoAsaas(fatura.asaas_payment_id);
      if (pix.payload && pix.payload !== fatura.pix_copia_e_cola) {
        fatura.pix_copia_e_cola = pix.payload;
        await this.faturaRepository.save(fatura);
      }

      return {
        payload: pix.payload ?? fatura.pix_copia_e_cola,
        imagemBase64: pix.encodedImage ?? null,
        dataExpiracao: pix.expirationDate ?? null,
      };
    } catch (erro) {
      throw new BadGatewayException(
        erro instanceof Error ? erro.message : 'Não foi possível carregar o Pix do Asaas.',
      );
    }
  }

  // Confere vínculo e carrega as relações exigidas para montar uma fatura completa.
  private async buscarContratoDoInquilino(contratoId: string, usuarioId: string) {
    const contrato = await this.contratoRepository.findOne({
      where: { id: contratoId },
      relations: { locatario: true },
    });

    if (!contrato) throw new NotFoundException('Contrato não encontrado.');
    if (String(contrato.locatario_id) !== String(usuarioId)) {
      throw new ForbiddenException('Este contrato não pertence ao inquilino autenticado.');
    }
    return contrato;
  }

  // Calcula o próximo dia de vencimento a partir do início do contrato ou da data atual.
  private calcularPrimeiroVencimento(contrato: Contrato): string {
    const dataInicio = new Date(`${contrato.data_inicio}T00:00:00.000Z`);
    const dataFim = new Date(`${contrato.data_fim}T00:00:00.000Z`);
    if (
      Number.isNaN(dataInicio.getTime()) ||
      Number.isNaN(dataFim.getTime()) ||
      contrato.dia_vencimento! < 1 ||
      contrato.dia_vencimento! > 31
    ) {
      throw new BadRequestException('As datas ou o dia de vencimento do contrato são inválidos.');
    }

    const agora = new Date();
    const hojeUtc = new Date(
      Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()),
    );
    const base = dataInicio > hojeUtc ? dataInicio : hojeUtc;
    let ano = base.getUTCFullYear();
    let mes = base.getUTCMonth();
    let vencimento = this.criarDataDeVencimento(ano, mes, contrato.dia_vencimento!);

    if (vencimento < base) {
      mes += 1;
      if (mes > 11) {
        ano += 1;
        mes = 0;
      }
      vencimento = this.criarDataDeVencimento(ano, mes, contrato.dia_vencimento!);
    }

    if (vencimento > dataFim) {
      throw new BadRequestException(
        'O contrato termina antes do próximo vencimento do aluguel.',
      );
    }
    return vencimento.toISOString().slice(0, 10);
  }

  // Ajusta vencimentos como dia 31 para o último dia de meses mais curtos.
  private criarDataDeVencimento(ano: number, mes: number, dia: number): Date {
    const ultimoDiaDoMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
    return new Date(Date.UTC(ano, mes, Math.min(dia, ultimoDiaDoMes)));
  }

  // Atualiza uma fatura recebida também pelo webhook ou cria a primeira parcela local.
  private async salvarPagamentoComoFatura(
    contrato: Contrato,
    pagamento: PagamentoAsaas,
  ) {
    const vencimento = pagamento.dueDate.slice(0, 10);
    let fatura = await this.faturaRepository.findOne({
      where: { asaas_payment_id: pagamento.id, contrato_id: contrato.id },
    });

    // O webhook pode registrar primeiro a parcela usando contrato e vencimento.
    if (!fatura) {
      fatura = await this.faturaRepository.findOne({
        where: { contrato_id: contrato.id, data_vencimento: vencimento },
      });
    }

    if (!fatura) {
      fatura = this.faturaRepository.create({
        contrato_id: contrato.id,
        imovel_id: contrato.imovel_id,
        locatario_id: contrato.locatario_id!,
        locador_id: contrato.locador_id,
      });
    }

    fatura.asaas_payment_id = pagamento.id;
    const statusAtual = fatura.status?.toUpperCase();
    const statusRecebido = this.normalizarStatusPagamento(pagamento.status);

    // Uma resposta antiga do Asaas nunca desfaz uma baixa já registrada como paga.
    if (statusAtual !== 'PAGO' || statusRecebido === 'PAGO') {
      fatura.status = statusRecebido;
    }

    if (Number.isFinite(Number(pagamento.value))) {
      fatura.valor = Number(pagamento.value).toFixed(2);
    }
    fatura.data_vencimento = vencimento;
    if (pagamento.bankSlipUrl) fatura.boleto_pdf_url = pagamento.bankSlipUrl;

    const dataPagamento =
      pagamento.confirmedDate || pagamento.paymentDate || pagamento.receivedAt;
    if (statusRecebido === 'PAGO' && dataPagamento) {
      fatura.data_pagamento = new Date(dataPagamento);
    }

    // A emissão do boleto não depende de Pix; o QR pode ser consultado depois, sob demanda.
    return this.faturaRepository.save(fatura);
  }

  // Converte os estados do Asaas para os status financeiros utilizados pelo sistema.
  private normalizarStatusPagamento(status?: string): string {
    switch (status?.toUpperCase()) {
      case 'RECEIVED':
      case 'CONFIRMED':
        return 'PAGO';
      case 'OVERDUE':
        return 'VENCIDO';
      case 'CANCELED':
      case 'CANCELLED':
      case 'DELETED':
        return 'CANCELADO';
      default:
        return 'PENDENTE';
    }
  }
}
