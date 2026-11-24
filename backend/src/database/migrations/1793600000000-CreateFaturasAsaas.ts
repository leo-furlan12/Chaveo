import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFaturasAsaas1793600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // IDs do Asaas são opcionais enquanto o registro ainda não foi enviado ao
    // gateway; UNIQUE permite vários NULLs no PostgreSQL e evita duplicações.
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN "asaas_customer_id" VARCHAR(80),
      ADD CONSTRAINT "uq_usuarios_asaas_customer_id" UNIQUE ("asaas_customer_id")
    `);

    await queryRunner.query(`
      ALTER TABLE "contratos"
      ADD COLUMN "asaas_subscription_id" VARCHAR(80),
      ADD COLUMN "asaas_subscription_status" VARCHAR(30),
      ADD CONSTRAINT "uq_contratos_asaas_subscription_id" UNIQUE ("asaas_subscription_id")
    `);

    await queryRunner.query(`
      CREATE TABLE "faturas" (
        "id" BIGINT GENERATED ALWAYS AS IDENTITY,
        "contrato_id" BIGINT NOT NULL,
        "imovel_id" BIGINT NOT NULL,
        "locatario_id" BIGINT NOT NULL,
        "locador_id" BIGINT NOT NULL,
        "asaas_payment_id" VARCHAR(80),
        "status" VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
        "pago" BOOLEAN GENERATED ALWAYS AS ("status" IN ('PAGO', 'CONFIRMADO', 'RECEBIDO', 'CONFIRMED', 'RECEIVED')) STORED,
        "valor" DECIMAL(10,2) NOT NULL,
        "data_vencimento" DATE NOT NULL,
        "boleto_pdf_url" TEXT,
        "pix_copia_e_cola" TEXT,
        "data_pagamento" TIMESTAMP,
        "criado_em" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "atualizado_em" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "faturas_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "uq_faturas_asaas_payment_id" UNIQUE ("asaas_payment_id"),
        CONSTRAINT "uq_faturas_contrato_vencimento" UNIQUE ("contrato_id", "data_vencimento"),
        CONSTRAINT "chk_faturas_valor_positivo" CHECK ("valor" > 0),
        CONSTRAINT "fk_faturas_contrato" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_faturas_imovel" FOREIGN KEY ("imovel_id") REFERENCES "imoveis"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_faturas_locatario" FOREIGN KEY ("locatario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_faturas_locador" FOREIGN KEY ("locador_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`CREATE INDEX "idx_faturas_contrato_vencimento" ON "faturas" ("contrato_id", "data_vencimento")`);
    await queryRunner.query(`CREATE INDEX "idx_faturas_locatario_status" ON "faturas" ("locatario_id", "status")`);
    await queryRunner.query(`CREATE INDEX "idx_faturas_locador" ON "faturas" ("locador_id")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_faturas_locador"`);
    await queryRunner.query(`DROP INDEX "idx_faturas_locatario_status"`);
    await queryRunner.query(`DROP INDEX "idx_faturas_contrato_vencimento"`);
    await queryRunner.query(`DROP TABLE "faturas"`);

    await queryRunner.query(`
      ALTER TABLE "contratos"
      DROP CONSTRAINT "uq_contratos_asaas_subscription_id",
      DROP COLUMN "asaas_subscription_status",
      DROP COLUMN "asaas_subscription_id"
    `);

    await queryRunner.query(`
      ALTER TABLE "usuarios"
      DROP CONSTRAINT "uq_usuarios_asaas_customer_id",
      DROP COLUMN "asaas_customer_id"
    `);
  }
}
