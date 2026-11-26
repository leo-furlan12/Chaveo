import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDadosTransferenciaWebhook1793900000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN "recebimento_banco_operacao" VARCHAR(3)
    `);

    await queryRunner.query(`
      ALTER TABLE "asaas_webhook_eventos"
      ADD COLUMN "asaas_transfer_id" VARCHAR(80),
      ADD COLUMN "dados_transferencia" JSONB
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_asaas_webhook_transfer_id"
      ON "asaas_webhook_eventos" ("asaas_transfer_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_asaas_webhook_transfer_id"`);
    await queryRunner.query(`
      ALTER TABLE "asaas_webhook_eventos"
      DROP COLUMN "dados_transferencia",
      DROP COLUMN "asaas_transfer_id"
    `);
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      DROP COLUMN "recebimento_banco_operacao"
    `);
  }
}
