import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDadosRecebimentoERepasses1793800000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      ADD COLUMN "recebimento_tipo" VARCHAR(20),
      ADD COLUMN "recebimento_pix_chave_cifrada" TEXT,
      ADD COLUMN "recebimento_pix_tipo" VARCHAR(10),
      ADD COLUMN "recebimento_banco_codigo" VARCHAR(10),
      ADD COLUMN "recebimento_banco_agencia_cifrada" TEXT,
      ADD COLUMN "recebimento_banco_agencia_digito_cifrado" TEXT,
      ADD COLUMN "recebimento_banco_conta_cifrada" TEXT,
      ADD COLUMN "recebimento_banco_conta_digito_cifrado" TEXT,
      ADD COLUMN "recebimento_banco_tipo_conta" VARCHAR(30),
      ADD COLUMN "recebimento_titular_nome_cifrado" TEXT,
      ADD COLUMN "recebimento_titular_documento_cifrado" TEXT,
      ADD CONSTRAINT "chk_usuarios_recebimento_tipo"
        CHECK ("recebimento_tipo" IS NULL OR "recebimento_tipo" IN ('PIX', 'CONTA_BANCARIA'))
    `);

    await queryRunner.query(`
      CREATE TABLE "repasses" (
        "id" BIGINT GENERATED ALWAYS AS IDENTITY,
        "fatura_id" BIGINT NOT NULL,
        "asaas_transfer_id" VARCHAR(80),
        "referencia_externa" VARCHAR(80) NOT NULL,
        "status" VARCHAR(30) NOT NULL DEFAULT 'AGUARDANDO',
        "valor" DECIMAL(10,2) NOT NULL,
        "motivo_falha" TEXT,
        "criado_em" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "atualizado_em" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "repasses_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "uq_repasses_fatura_id" UNIQUE ("fatura_id"),
        CONSTRAINT "uq_repasses_asaas_transfer_id" UNIQUE ("asaas_transfer_id"),
        CONSTRAINT "uq_repasses_referencia_externa" UNIQUE ("referencia_externa"),
        CONSTRAINT "fk_repasses_fatura" FOREIGN KEY ("fatura_id") REFERENCES "faturas"("id") ON DELETE RESTRICT,
        CONSTRAINT "chk_repasses_valor_positivo" CHECK ("valor" > 0)
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "repasses"`);
    await queryRunner.query(`
      ALTER TABLE "usuarios"
      DROP CONSTRAINT "chk_usuarios_recebimento_tipo",
      DROP COLUMN "recebimento_titular_documento_cifrado",
      DROP COLUMN "recebimento_titular_nome_cifrado",
      DROP COLUMN "recebimento_banco_tipo_conta",
      DROP COLUMN "recebimento_banco_conta_digito_cifrado",
      DROP COLUMN "recebimento_banco_conta_cifrada",
      DROP COLUMN "recebimento_banco_agencia_digito_cifrado",
      DROP COLUMN "recebimento_banco_agencia_cifrada",
      DROP COLUMN "recebimento_banco_codigo",
      DROP COLUMN "recebimento_pix_tipo",
      DROP COLUMN "recebimento_pix_chave_cifrada",
      DROP COLUMN "recebimento_tipo"
    `);
  }
}
