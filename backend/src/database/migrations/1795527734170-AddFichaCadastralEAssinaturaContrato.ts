import { MigrationInterface, QueryRunner } from "typeorm";

export class AddFichaCadastralEAssinaturaContrato1795527734170 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
    ALTER TABLE "contratos"
      ADD COLUMN "renda_mensal_locatario" NUMERIC(10,2),
      ADD COLUMN "ocupacao_locatario" VARCHAR(150),
      ADD COLUMN "documentos_locatario" JSONB DEFAULT '[]'::jsonb,
      ADD COLUMN "status_analise_cadastral" VARCHAR(30) NOT NULL DEFAULT 'PENDENTE',
      ADD COLUMN "justificativa_analise" TEXT,
      ADD COLUMN "data_analise_cadastral" TIMESTAMP,
      ADD COLUMN "arquivo_contrato_assinado" VARCHAR(255),
      ADD COLUMN "data_assinatura_final" TIMESTAMP;
  `);
    }
        
    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
