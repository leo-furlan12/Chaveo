import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAsaasWebhookEventos1793700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Mantém o ID único do Asaas como chave primária para descartar reenvios duplicados.
    await queryRunner.query(`
      CREATE TABLE "asaas_webhook_eventos" (
        "id" VARCHAR(120) NOT NULL,
        "tipo" VARCHAR(80) NOT NULL,
        "asaas_payment_id" VARCHAR(80),
        "dados_pagamento" JSONB,
        "status_processamento" VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
        "tentativas" INTEGER NOT NULL DEFAULT 0,
        "proxima_tentativa_em" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "ultimo_erro" TEXT,
        "criado_em" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "atualizado_em" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "asaas_webhook_eventos_pkey" PRIMARY KEY ("id")
      )
    `);

    // O índice permite que o processador encontre rapidamente eventos prontos para nova tentativa.
    await queryRunner.query(`
      CREATE INDEX "idx_asaas_webhook_fila"
      ON "asaas_webhook_eventos" ("status_processamento", "proxima_tentativa_em", "criado_em")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_asaas_webhook_fila"`);
    await queryRunner.query(`DROP TABLE "asaas_webhook_eventos"`);
  }
}
