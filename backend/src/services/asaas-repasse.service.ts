import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ErroRequisicaoAsaas, criarTransferenciaAsaas } from '../lib/asaas';
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

  // Cria no máximo um repasse por fatura e só o solicita após a confirmação do pagamento.
  async iniciarRepasseDaFatura(faturaId: string): Promise<void> {
    const destino = await this.buscarDestinoDoProprietario(faturaId);
    if (!destino) {
      throw new Error(`Configure os dados de recebimento do proprietário da fatura ${faturaId}.`);
    }

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

    try {
      const transferencia = await criarTransferenciaAsaas({
        valor: Number(repasse.valor),
        referenciaExterna,
        destino,
      });

      repasse.asaas_transfer_id = transferencia.id;
      repasse.status = this.normalizarStatusTransferencia(transferencia.status);
      repasse.motivo_falha = transferencia.failReason ?? null;
      await this.dataSource.getRepository(Repasse).save(repasse);
    } catch (erro) {
      const httpStatus = erro instanceof ErroRequisicaoAsaas ? erro.statusHttp : null;
      const mensagem = erro instanceof Error ? erro.message : 'Falha desconhecida no Asaas.';

      // Respostas HTTP 4xx recusam a criação. Saldo insuficiente pode ser tentado novamente.
      if (httpStatus && httpStatus < 500) {
        const aguardaSaldo = /saldo|disponível|disponivel|insuficiente/i.test(mensagem);
        repasse.status = aguardaSaldo ? 'AGUARDANDO_SALDO' : 'FALHA';
        repasse.motivo_falha = mensagem;
        await this.dataSource.getRepository(Repasse).save(repasse);
        if (!aguardaSaldo) {
          this.logger.error(`Repasse ${repasse.id} recusado pelo Asaas: ${mensagem}`);
          return;
        }
      } else {
        // Uma falha de rede/servidor pode ocorrer depois da criação remota; não repete às cegas.
        repasse.status = 'VERIFICAR';
        repasse.motivo_falha = mensagem;
        await this.dataSource.getRepository(Repasse).save(repasse);
        this.logger.error(`Resultado incerto no repasse ${repasse.id}: ${mensagem}`);
        return;
      }

      throw erro;
    }
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

    if (!encontrado) return false;
    if (transferencia.id) encontrado.asaas_transfer_id = transferencia.id;
    encontrado.status = this.normalizarStatusTransferencia(
      transferencia.status ?? tipoEvento.replace('TRANSFER_', ''),
    );
    encontrado.motivo_falha = transferencia.failReason ?? null;
    await repositorio.save(encontrado);
    return true;
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
