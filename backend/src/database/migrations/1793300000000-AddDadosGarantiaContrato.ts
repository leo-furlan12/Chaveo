import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDadosGarantiaContrato1793300000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contratos"
      ADD COLUMN "fiador_nome" varchar(150),
      ADD COLUMN "fiador_cpf" varchar(11),
      ADD COLUMN "fiador_qualificacao" text,
      ADD COLUMN "fiador_imovel" text,
      ADD COLUMN "seguro_seguradora" varchar(150),
      ADD COLUMN "seguro_apolice" varchar(100)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "contratos"
      DROP COLUMN "fiador_nome",
      DROP COLUMN "fiador_cpf",
      DROP COLUMN "fiador_qualificacao",
      DROP COLUMN "fiador_imovel",
      DROP COLUMN "seguro_seguradora",
      DROP COLUMN "seguro_apolice"
    `);
  }
}