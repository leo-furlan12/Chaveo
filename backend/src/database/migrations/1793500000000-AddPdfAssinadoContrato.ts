
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPdfAssinadoContrato1793500000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // adiciona o caminho do pdf assinado
    await queryRunner.query(`
      ALTER TABLE "contratos"
      ADD COLUMN "pdf_assinado_path" varchar(255)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // remove a coluna se a migration for revertida
    await queryRunner.query(`
      ALTER TABLE "contratos"
      DROP COLUMN "pdf_assinado_path"
    `);
  }
}
