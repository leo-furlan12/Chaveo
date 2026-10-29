import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCpfLocatarioContrato1793203200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // adiciona o cpf do inquilino indicado pelo proprietario
    await queryRunner.query(`
      ALTER TABLE "contratos"
      ADD COLUMN "cpf_locatario" VARCHAR(11)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // remove a coluna se a migration for desfeita
    await queryRunner.query(`
      ALTER TABLE "contratos"
      DROP COLUMN "cpf_locatario"
    `);
  }
  
}