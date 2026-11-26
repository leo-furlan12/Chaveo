import { Column, CreateDateColumn, Entity, PrimaryColumn, UpdateDateColumn } from 'typeorm';

@Entity('asaas_webhook_eventos')
export class AsaasWebhookEvento {
  // O ID enviado pelo Asaas é a chave de idempotência para reentregas do mesmo evento.
  @PrimaryColumn({ type: 'varchar', length: 120 })
  id: string;

  @Column({ type: 'varchar', length: 80 })
  tipo: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  asaas_payment_id: string | null;

  // Guarda somente os campos financeiros necessários, sem persistir dados pessoais do pagador.
  @Column({ type: 'jsonb', nullable: true })
  dados_pagamento: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 20, default: 'PENDENTE' })
  status_processamento: string;

  @Column({ type: 'integer', default: 0 })
  tentativas: number;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  proxima_tentativa_em: Date;

  @Column({ type: 'text', nullable: true })
  ultimo_erro: string | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  criado_em: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  atualizado_em: Date;
}
