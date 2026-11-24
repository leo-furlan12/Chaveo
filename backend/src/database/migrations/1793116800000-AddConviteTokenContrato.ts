import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddConviteTokenContrato1793116800000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // adiciona o campo do convite na tabela contratos
    await queryRunner.query(`
      ALTER TABLE "contratos"
      ADD COLUMN "convite_token" VARCHAR(64) UNIQUE
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // remove o campo caso a migration seja desfeita
    await queryRunner.query(`
      ALTER TABLE "contratos"
      DROP COLUMN "convite_token"
    `);
  }
}