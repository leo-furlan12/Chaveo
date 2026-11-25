import { BadGatewayException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, IsNull } from 'typeorm';
import { ErroRequisicaoAsaas, consultarTransferenciaAsaas, criarTransferenciaAsaas } from '../lib/asaas';
import { Fatura } from '../database/entities/fatura.entity';
import { Repasse } from '../database/entities/repasse.entity';
import { Usuario } from '../database/entities/usuario.entity';
import { DadosRecebimentoCriptoService } from './dados-recebimento-cripto.service';

interface DadosTransferenciaWebhook {
  id?: string;
  status?: string;
  externalReference?: string;
  value?: number;
  failReason?: string | null;
}

@Injectable()
export class AsaasRepasseService {
  private readonly logger = new Logger(AsaasRepasseService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly cripto: DadosRecebimentoCriptoService,
  ) {}

  async reagendarRepasse(faturaId: string, locadorId: string) {
    await this.dataSource.transaction(async (manager) => {
      const fatura = await manager.findOne(Fatura, {
        where: { id: faturaId, locador_id: locadorId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!fatura) throw new NotFoundException('Fatura não encontrada.');

      const repasse = await manager.findOne(Repasse, {
        where: { fatura_id: fatura.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!fatura.pago || !fatura.asaas_payment_id ||
        repasse?.status !== 'FALHA') {
        throw new ConflictException('Este repasse não está disponível para nova tentativa.');
      }

      if (repasse.asaas_transfer_id) {
        const transferencia = await consultarTransferenciaAsaas(repasse.asaas_transfer_id).catch(() => {
          throw new BadGatewayException('Não foi possível confirmar a situação da transferência anterior no Asaas.');
        });
        if (transferencia.id !== repasse.asaas_transfer_id ||
          !['FAILED', 'CANCELLED'].includes(transferencia.status?.toUpperCase() ?? '')) {
          throw new ConflictException('O Asaas ainda não confirmou a falha ou o cancelamento da transferência anterior.');
        }
      }

      const [evento] = await manager.query(
        `SELECT "id"
         FROM "asaas_webhook_eventos"
         WHERE "asaas_payment_id" = $1
           AND "status_processamento" = 'PROCESSADO'
           AND "tipo" IN ('PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED')
         ORDER BY "criado_em" DESC, "id" DESC
         LIMIT 1
         FOR UPDATE`,
        [fatura.asaas_payment_id],
      );
      if (!evento) {
        throw new ConflictException('A confirmação do pagamento ainda não está disponível para reprocessamento.');
      }

      await manager.update(Repasse, repasse.id, {
        status: 'AGUARDANDO',
        motivo_falha: null,
        asaas_transfer_id: null,
        referencia_externa: `repasse-fatura-${fatura.id}-${randomUUID()}`,
      });
      await manager.query(
        `UPDATE "asaas_webhook_eventos"
         SET "status_processamento" = 'PENDENTE', "tentativas" = 0,
             "proxima_tentativa_em" = CURRENT_TIMESTAMP, "ultimo_erro" = NULL,
             "atualizado_em" = CURRENT_TIMESTAMP
         WHERE "id" = $1`,
        [evento.id],
      );
    });

    return { mensagem: 'Nova tentativa de repasse agendada.' };
  }

  // Cria no máximo um repasse por fatura e só o solicita após a confirmação do pagamento.
  async iniciarRepasseDaFatura(faturaId: string): Promise<void> {
    const referenciaExterna = `repasse-fatura-${faturaId}`;
    const repasse = await this.dataSource.transaction(async (gerenciador) => {
      const repositorioFatura = gerenciador.getRepository(Fatura);
      const fatura = await repositorioFatura.findOne({
        where: { id: faturaId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!fatura || !fatura.pago) return null;

      const repositorioRepasse = gerenciador.getRepository(Repasse);
      let atual = await repositorioRepasse.findOne({
        where: { fatura_id: faturaId },
        lock: { mode: 'pessimistic_write' },
      });

      if (atual?.asaas_transfer_id || atual?.status === 'PROCESSANDO') return null;
      if (atual?.status === 'VERIFICAR' || atual?.status === 'CONCLUIDO') return null;

      if (!atual) {
        atual = repositorioRepasse.create({
          fatura_id: fatura.id,
          asaas_transfer_id: null,
          referencia_externa: referenciaExterna,
          status: 'AGUARDANDO',
          valor: fatura.valor,
          motivo_falha: null,
        });
      }

      atual.status = 'PROCESSANDO';
      atual.motivo_falha = null;
      return repositorioRepasse.save(atual);
    });

    if (!repasse) return;

    const destino = await this.buscarDestinoDoProprietario(faturaId).catch(async (erro: unknown) => {
      await this.registrarEsperaPorDestino(repasse.id, 'Não foi possível consultar o destino de recebimento.');
      throw erro;
    });
    if (!destino) {
      const mensagem = `Configure os dados de recebimento do proprietário da fatura ${faturaId}.`;
      await this.registrarEsperaPorDestino(repasse.id, mensagem);
      throw new Error(mensagem);
    }

    const repositorioRepasse = this.dataSource.getRepository(Repasse);
    const tentativaSemTransferencia = {
      id: repasse.id,
      referencia_externa: repasse.referencia_externa,
      asaas_transfer_id: IsNull(),
    };

    try {
      const transferencia = await criarTransferenciaAsaas({
        valor: Number(repasse.valor),
        referenciaExterna: repasse.referencia_externa,
        destino,
      });

      await repositorioRepasse.update(
        tentativaSemTransferencia,
        {
          asaas_transfer_id: transferencia.id,
          status: this.normalizarStatusTransferencia(transferencia.status),
          motivo_falha: transferencia.failReason ?? null,
        },
      );
    } catch (erro) {
      const httpStatus = erro instanceof ErroRequisicaoAsaas ? erro.statusHttp : null;
      const mensagem = erro instanceof Error ? erro.message : 'Falha desconhecida no Asaas.';

      // Recusas explícitas podem ser corrigidas. Timeout e conflito exigem conciliação.
      if (httpStatus && httpStatus < 500 && httpStatus !== 408 && httpStatus !== 409) {
        const aguardaSaldo = /saldo|disponível|disponivel|insuficiente/i.test(mensagem);
        const resultado = await repositorioRepasse.update(tentativaSemTransferencia, {
          status: aguardaSaldo ? 'AGUARDANDO_SALDO' : 'FALHA',
          motivo_falha: mensagem,
        });
        if (!resultado.affected) return;
        if (!aguardaSaldo) {
          this.logger.error(`Repasse ${repasse.id} recusado pelo Asaas: ${mensagem}`);
          return;
        }
      } else {
        // Uma falha de rede/servidor pode ocorrer depois da criação remota; não repete às cegas.
        await repositorioRepasse.update(tentativaSemTransferencia, {
          status: 'VERIFICAR',
          motivo_falha: mensagem,
        });
        this.logger.error(`Resultado incerto no repasse ${repasse.id}: ${mensagem}`);
        return;
      }

      throw erro;
    }
  }

  private async registrarEsperaPorDestino(repasseId: string, motivo: string) {
    await this.dataSource.getRepository(Repasse).update(repasseId, {
      status: 'AGUARDANDO_DESTINO',
      motivo_falha: motivo,
    });
  }

  // Atualiza o repasse pelos eventos de transferência, mesmo se a resposta POST não chegou ao backend.
  async processarEventoTransferencia(
    tipoEvento: string,
    transferencia: DadosTransferenciaWebhook | null,
  ): Promise<boolean> {
    if (!transferencia?.id && !transferencia?.externalReference) return false;

    const repositorio = this.dataSource.getRepository(Repasse);
    const repasse = transferencia.id
      ? await repositorio.findOne({ where: { asaas_transfer_id: transferencia.id } })
      : null;
    const encontrado = repasse ?? (transferencia.externalReference
      ? await repositorio.findOne({
          where: { referencia_externa: transferencia.externalReference },
        })
      : null);

    if (!encontrado || (transferencia.id && encontrado.asaas_transfer_id &&
      transferencia.id !== encontrado.asaas_transfer_id)) return false;
    const status = this.normalizarStatusTransferencia(
      transferencia.status ?? tipoEvento.replace('TRANSFER_', ''),
    );
    const atualizacao = repositorio.createQueryBuilder()
      .update(Repasse)
      .set({
        asaas_transfer_id: transferencia.id ?? encontrado.asaas_transfer_id,
        status,
        motivo_falha: transferencia.failReason ?? null,
      })
      .where({ id: encontrado.id, referencia_externa: encontrado.referencia_externa })
      .andWhere('(asaas_transfer_id IS NULL OR asaas_transfer_id = :transferId)', {
        transferId: transferencia.id ?? encontrado.asaas_transfer_id,
      })
      .andWhere("status <> 'CONCLUIDO'");

    if (['PROCESSANDO', 'PROCESSANDO_BANCO', 'BLOQUEADO'].includes(status)) {
      atualizacao.andWhere("status NOT IN ('FALHA', 'CANCELADO')");
    }

    const resultado = await atualizacao.execute();
    return Boolean(resultado.affected);
  }

  private async buscarDestinoDoProprietario(faturaId: string) {
    const fatura = await this.dataSource.getRepository(Fatura).findOne({
      where: { id: faturaId },
      relations: { locador: true },
    });
    if (!fatura?.locador) return null;

    const proprietario: Usuario = fatura.locador;
    if (proprietario.recebimento_tipo === 'PIX') {
      const chave = this.cripto.descriptografar(
        proprietario.recebimento_pix_chave_cifrada,
      );
      if (!chave || !proprietario.recebimento_pix_tipo) return null;
      return {
        tipo: 'PIX' as const,
        chave,
        tipoChave: proprietario.recebimento_pix_tipo,
      };
    }

    if (proprietario.recebimento_tipo !== 'CONTA_BANCARIA') return null;
    const agencia = this.cripto.descriptografar(
      proprietario.recebimento_banco_agencia_cifrada,
    );
    const conta = this.cripto.descriptografar(
      proprietario.recebimento_banco_conta_cifrada,
    );
    const digitoConta = this.cripto.descriptografar(
      proprietario.recebimento_banco_conta_digito_cifrado,
    );
    const titularNome = this.cripto.descriptografar(
      proprietario.recebimento_titular_nome_cifrado,
    );
    const titularDocumento = this.cripto.descriptografar(
      proprietario.recebimento_titular_documento_cifrado,
    );

    if (
      !proprietario.recebimento_banco_codigo || !agencia || !conta ||
      !digitoConta || !titularNome || !titularDocumento ||
      !proprietario.recebimento_banco_tipo_conta ||
      !['PIX', 'TED'].includes(proprietario.recebimento_banco_operacao || '')
    ) {
      return null;
    }

    return {
      tipo: 'CONTA_BANCARIA' as const,
      codigoBanco: proprietario.recebimento_banco_codigo,
      titularNome,
      titularDocumento,
      agencia,
      digitoAgencia: this.cripto.descriptografar(
        proprietario.recebimento_banco_agencia_digito_cifrado,
      ) ?? undefined,
      conta,
      digitoConta,
      tipoConta: proprietario.recebimento_banco_tipo_conta,
      operacao: proprietario.recebimento_banco_operacao as 'PIX' | 'TED',
    };
  }

  private normalizarStatusTransferencia(status?: string): string {
    switch (status?.toUpperCase()) {
      case 'DONE':
      case 'TRANSFER_DONE':
        return 'CONCLUIDO';
      case 'FAILED':
      case 'TRANSFER_FAILED':
        return 'FALHA';
      case 'CANCELLED':
      case 'CANCELED':
      case 'TRANSFER_CANCELLED':
        return 'CANCELADO';
      case 'BLOCKED':
      case 'TRANSFER_BLOCKED':
        return 'BLOQUEADO';
      case 'BANK_PROCESSING':
      case 'TRANSFER_IN_BANK_PROCESSING':
        return 'PROCESSANDO_BANCO';
      default:
        return 'PROCESSANDO';
    }
  }
}
