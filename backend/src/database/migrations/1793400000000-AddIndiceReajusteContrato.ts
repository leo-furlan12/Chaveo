import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddIndiceReajusteContrato1793400000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // adiciona o indice de reajuste ao contrato
    await queryRunner.query(`
      ALTER TABLE "contratos"
      ADD COLUMN "indice_reajuste" varchar(10)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // remove a coluna caso a migration seja revertida
    await queryRunner.query(`
      ALTER TABLE "contratos"
      DROP COLUMN "indice_reajuste"
    `);
  }
}