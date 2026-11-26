import {
  BadRequestException,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { timingSafeEqual } from 'crypto';
import { DataSource } from 'typeorm';
import { Contrato } from '../database/entities/contrato.entity';
import { Fatura } from '../database/entities/fatura.entity';
import { AsaasRepasseService } from './asaas-repasse.service';

interface PagamentoWebhookAsaas {
  id?: string;
  subscription?: string | null;
  status?: string;
  value?: number;
  dueDate?: string;
  bankSlipUrl?: string | null;
  confirmedDate?: string | null;
  paymentDate?: string | null;
  receivedAt?: string | null;
}

interface EventoWebhookAsaas {
  id?: string;
  event?: string;
  payment?: PagamentoWebhookAsaas;
  transfer?: TransferenciaWebhookAsaas;
}

interface TransferenciaWebhookAsaas {
  id?: string;
  status?: string;
  externalReference?: string;
  value?: number;
  failReason?: string | null;
}

interface EventoFilaAsaas {
  id: string;
  tipo: string;
  asaas_payment_id: string | null;
  dados_pagamento: PagamentoWebhookAsaas | null;
  asaas_transfer_id: string | null;
  dados_transferencia: TransferenciaWebhookAsaas | null;
  tentativas: number;
}

const EVENTOS_DE_PAGAMENTO = new Set([
  'PAYMENT_CREATED',
  'PAYMENT_RECEIVED',
  'PAYMENT_CONFIRMED',
  'PAYMENT_OVERDUE',
]);

const EVENTOS_DE_TRANSFERENCIA = new Set([
  'TRANSFER_PENDING',
  'TRANSFER_DONE',
  'TRANSFER_FAILED',
  'TRANSFER_CANCELLED',
  'TRANSFER_IN_BANK_PROCESSING',
  'TRANSFER_BLOCKED',
]);

@Injectable()
export class AsaasWebhookService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AsaasWebhookService.name);
  private temporizador: NodeJS.Timeout | null = null;
  private processandoFila = false;

  constructor(
    private readonly dataSource: DataSource,
    private readonly asaasRepasseService: AsaasRepasseService,
  ) {}

  // Inicia o consumidor persistente para retomar eventos após reinício do backend.
  onModuleInit(): void {
    this.temporizador = setInterval(() => {
      void this.processarFilaDeEventos();
    }, 3000);
    this.temporizador.unref();
    void this.processarFilaDeEventos();
  }

  // Encerra o temporizador quando o Nest finalizar o módulo.
  onModuleDestroy(): void {
    if (this.temporizador) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }
  }

  // Confere o token do Asaas e persiste o evento antes de responder HTTP 200.
  async receberEvento(tokenRecebido: string | undefined, corpo: EventoWebhookAsaas) {
    this.validarTokenWebhook(tokenRecebido);

    if (
      typeof corpo?.id !== 'string' ||
      !corpo.id ||
      corpo.id.length > 120 ||
      typeof corpo.event !== 'string' ||
      !corpo.event ||
      corpo.event.length > 80
    ) {
      throw new BadRequestException('O evento do Asaas não possui identificador ou tipo válidos.');
    }

    const pagamento = corpo.payment;
    const pagamentoId = typeof pagamento?.id === 'string' ? pagamento.id : null;
    const transferencia = corpo.transfer;
    const transferenciaId = typeof transferencia?.id === 'string'
      ? transferencia.id
      : null;
    const eventoProcessavel = Boolean(
      (pagamentoId && EVENTOS_DE_PAGAMENTO.has(corpo.event)) ||
      ((transferenciaId || transferencia?.externalReference) &&
        EVENTOS_DE_TRANSFERENCIA.has(corpo.event)),
    );

    // Copia somente campos de cobrança necessários para não guardar dados pessoais enviados no webhook.
    const dadosPagamento = pagamento
      ? {
          id: pagamento.id,
          subscription: pagamento.subscription,
          status: pagamento.status,
          value: pagamento.value,
          dueDate: pagamento.dueDate,
          bankSlipUrl: pagamento.bankSlipUrl,
          confirmedDate: pagamento.confirmedDate,
          paymentDate: pagamento.paymentDate,
          receivedAt: pagamento.receivedAt,
        }
      : null;

    // Persiste somente campos financeiros da transferência necessários para conciliação.
    const dadosTransferencia = transferencia
      ? {
          id: transferencia.id,
          status: transferencia.status,
          externalReference: transferencia.externalReference,
          value: transferencia.value,
          failReason: transferencia.failReason,
        }
      : null;

    // O conflito no ID significa que o Asaas reenviou um evento já recebido.
    const inseridos = await this.dataSource.query(
      `
        INSERT INTO "asaas_webhook_eventos"
          ("id", "tipo", "asaas_payment_id", "dados_pagamento", "asaas_transfer_id",
           "dados_transferencia", "status_processamento")
        VALUES ($1, $2, $3, $4::jsonb, $5, $6::jsonb, $7)
        ON CONFLICT ("id") DO NOTHING
        RETURNING "id"
      `,
      [
        corpo.id,
        corpo.event,
        pagamentoId,
        dadosPagamento ? JSON.stringify(dadosPagamento) : null,
        transferenciaId,
        dadosTransferencia ? JSON.stringify(dadosTransferencia) : null,
        eventoProcessavel ? 'PENDENTE' : 'IGNORADO',
      ],
    );

    return {
      recebido: true,
      duplicado: inseridos.length === 0,
    };
  }

  // Exige o segredo configurado e compara os bytes em tempo constante.
  private validarTokenWebhook(tokenRecebido?: string): void {
    const tokenConfigurado = process.env.ASAAS_WEBHOOK_TOKEN;

    if (!tokenConfigurado || tokenConfigurado.length < 32 || tokenConfigurado.length > 255) {
      throw new ServiceUnavailableException(
        'Configure ASAAS_WEBHOOK_TOKEN com um token entre 32 e 255 caracteres.',
      );
    }

    if (!tokenRecebido) {
      throw new UnauthorizedException('Token do webhook não informado.');
    }

    const bytesRecebidos = Buffer.from(tokenRecebido);
    const bytesConfigurados = Buffer.from(tokenConfigurado);

    if (
      bytesRecebidos.length !== bytesConfigurados.length ||
      !timingSafeEqual(bytesRecebidos, bytesConfigurados)
    ) {
      throw new UnauthorizedException('Token do webhook inválido.');
    }
  }

  // Busca e reivindica eventos atomicamente para que duas instâncias não processem o mesmo item.
  private async reivindicarProximoEvento(): Promise<EventoFilaAsaas | null> {
    const eventos = (await this.dataSource.query(`
      WITH "proximo_evento" AS (
        SELECT "id"
        FROM "asaas_webhook_eventos"
        WHERE (
          "status_processamento" IN ('PENDENTE', 'ERRO')
          AND "proxima_tentativa_em" <= CURRENT_TIMESTAMP
        ) OR (
          "status_processamento" = 'PROCESSANDO'
          AND "atualizado_em" < CURRENT_TIMESTAMP - INTERVAL '5 minutes'
        )
        ORDER BY "criado_em"
        LIMIT 1
        FOR UPDATE SKIP LOCKED
      ), "evento_reivindicado" AS (
        UPDATE "asaas_webhook_eventos" AS evento
        SET "status_processamento" = 'PROCESSANDO',
            "tentativas" = evento."tentativas" + 1,
            "atualizado_em" = CURRENT_TIMESTAMP
        FROM "proximo_evento"
        WHERE evento."id" = "proximo_evento"."id"
        RETURNING evento."id", evento."tipo", evento."asaas_payment_id",
                  evento."dados_pagamento", evento."asaas_transfer_id",
                  evento."dados_transferencia", evento."tentativas"
      )
      SELECT * FROM "evento_reivindicado"
      /*
      UPDATE "asaas_webhook_eventos" AS evento
      SET "status_processamento" = 'PROCESSANDO',
          "tentativas" = evento."tentativas" + 1,
          "atualizado_em" = CURRENT_TIMESTAMP
      FROM "proximo_evento"
      WHERE evento."id" = "proximo_evento"."id"
      RETURNING evento."id", evento."tipo", evento."asaas_payment_id",
                evento."dados_pagamento", evento."asaas_transfer_id",
                evento."dados_transferencia", evento."tentativas"
      */
    `)) as EventoFilaAsaas[];

    return eventos[0] || null;
  }

  // Processa uma quantidade limitada por ciclo para manter o servidor responsivo.
  private async processarFilaDeEventos(): Promise<void> {
    if (this.processandoFila) return;

    this.processandoFila = true;
    try {
      for (let quantidade = 0; quantidade < 20; quantidade += 1) {
        const evento = await this.reivindicarProximoEvento();
        if (!evento) break;

        try {
          const processavel = await this.processarEvento(evento);
          await this.marcarEventoComoConcluido(
            evento.id,
            processavel ? 'PROCESSADO' : 'IGNORADO',
          );
        } catch (erro) {
          await this.agendarNovaTentativa(evento, erro);
        }
      }
    } catch (erro) {
      this.logger.error(
        `Falha ao consultar a fila de webhooks: ${erro instanceof Error ? erro.message : 'erro desconhecido'}`,
      );
    } finally {
      this.processandoFila = false;
    }
  }

  // Atualiza ou cria a fatura correspondente ao pagamento enviado no evento.
  private async processarEvento(evento: EventoFilaAsaas): Promise<boolean> {
    if (EVENTOS_DE_TRANSFERENCIA.has(evento.tipo)) {
      return this.asaasRepasseService.processarEventoTransferencia(
        evento.tipo,
        evento.dados_transferencia,
      );
    }

    const pagamento = evento.dados_pagamento;
    if (!pagamento?.id || !pagamento.dueDate) return false;

    const contratoRepository = this.dataSource.getRepository(Contrato);
    const faturaRepository = this.dataSource.getRepository(Fatura);
    const faturaExistente = await faturaRepository.findOne({
      where: { asaas_payment_id: pagamento.id },
    });

    let contrato = faturaExistente
      ? await contratoRepository.findOne({
          where: { id: faturaExistente.contrato_id },
          relations: { imovel: true, locatario: true },
        })
      : null;

    // A assinatura no pagamento identifica qual contrato gerou a cobrança.
    if (!contrato && pagamento.subscription) {
      contrato = await contratoRepository.findOne({
        where: { asaas_subscription_id: pagamento.subscription },
        relations: { imovel: true, locatario: true },
      });
    }

    // Dá tempo para uma notificação chegar enquanto a transação da assinatura ainda está sendo confirmada.
    if (!contrato && pagamento.subscription && evento.tentativas < 6) {
      throw new Error('A assinatura do evento ainda não está vinculada a um contrato local.');
    }

    // Webhooks de outras assinaturas da conta ou sem vínculos mínimos não pertencem a este sistema.
    if (!contrato || !contrato.locatario || !contrato.imovel) return false;

    const statusRecebido = this.obterStatusFatura(evento.tipo, pagamento.status);

    const faturaAtualizada = await this.dataSource.transaction(async (gerenciador) => {
      const repositorioFatura = gerenciador.getRepository(Fatura);
      let fatura = await repositorioFatura.findOne({
        where: { asaas_payment_id: pagamento.id },
      });

      // A primeira fatura pode ter sido criada como provisória antes do evento PAYMENT_CREATED.
      if (!fatura) {
        fatura = await repositorioFatura.findOne({
          where: {
            contrato_id: contrato!.id,
            data_vencimento: pagamento.dueDate!,
          },
        });
      }

      if (!fatura) {
        fatura = repositorioFatura.create({
          contrato_id: contrato!.id,
          imovel_id: contrato!.imovel_id,
          locatario_id: contrato!.locatario_id!,
          locador_id: contrato!.locador_id,
          asaas_payment_id: null,
          status: 'PENDENTE',
          valor: contrato!.valor_aluguel || '0.00',
          data_vencimento: pagamento.dueDate!,
          boleto_pdf_url: null,
          pix_copia_e_cola: null,
          data_pagamento: null,
        });
      }

      // A ordem de entrega pode variar: um evento antigo não deve regredir pago para vencido/pendente.
      if (
        fatura.status !== 'PAGO' &&
        !(fatura.status === 'VENCIDO' && statusRecebido === 'PENDENTE')
      ) {
        fatura.status = statusRecebido;
      }

      fatura.asaas_payment_id = pagamento.id!;
      fatura.valor =
        typeof pagamento.value === 'number'
          ? pagamento.value.toFixed(2)
          : fatura.valor;
      fatura.data_vencimento = pagamento.dueDate!;
      fatura.boleto_pdf_url = pagamento.bankSlipUrl || fatura.boleto_pdf_url;
      // O webhook registra a cobrança sem consultar Pix; um payload já existente é preservado.

      const dataPagamento =
        pagamento.receivedAt || pagamento.paymentDate || pagamento.confirmedDate;
      if (statusRecebido === 'PAGO' && dataPagamento) {
        fatura.data_pagamento = new Date(dataPagamento);
      }

      return repositorioFatura.save(fatura);
    });

    if (statusRecebido === 'PAGO') {
      await this.asaasRepasseService.iniciarRepasseDaFatura(faturaAtualizada.id);
    }

    return true;
  }

  // Traduz eventos e status do Asaas para os estados locais da fatura.
  private obterStatusFatura(tipoEvento: string, statusPagamento?: string): string {
    if (tipoEvento === 'PAYMENT_RECEIVED' || tipoEvento === 'PAYMENT_CONFIRMED') {
      return 'PAGO';
    }
    if (tipoEvento === 'PAYMENT_OVERDUE') return 'VENCIDO';

    switch (statusPagamento) {
      case 'RECEIVED':
      case 'CONFIRMED':
        return 'PAGO';
      case 'OVERDUE':
        return 'VENCIDO';
      default:
        return 'PENDENTE';
    }
  }

  // Marca um evento como concluído ou ignorado sem guardar novamente seu payload.
  private async marcarEventoComoConcluido(id: string, status: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE "asaas_webhook_eventos"
       SET "status_processamento" = $2, "ultimo_erro" = NULL,
           "atualizado_em" = CURRENT_TIMESTAMP
       WHERE "id" = $1`,
      [id, status],
    );
  }

  // Agenda nova tentativa com espera crescente para falhas temporárias de banco ou da API Pix.
  private async agendarNovaTentativa(evento: EventoFilaAsaas, erro: unknown): Promise<void> {
    const atrasoMs = Math.min(15 * 60 * 1000, 5000 * 2 ** Math.min(evento.tentativas - 1, 10));
    const mensagem = erro instanceof Error ? erro.message.slice(0, 2000) : 'Erro desconhecido';

    await this.dataSource.query(
      `UPDATE "asaas_webhook_eventos"
       SET "status_processamento" = 'ERRO',
           "proxima_tentativa_em" = CURRENT_TIMESTAMP + ($2 * INTERVAL '1 millisecond'),
           "ultimo_erro" = $3,
           "atualizado_em" = CURRENT_TIMESTAMP
       WHERE "id" = $1`,
      [evento.id, atrasoMs, mensagem],
    );

    this.logger.warn(`Evento Asaas ${evento.id} tentará novamente: ${mensagem}`);
  }
}
