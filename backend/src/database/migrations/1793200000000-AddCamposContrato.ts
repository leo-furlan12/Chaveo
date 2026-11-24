
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCamposContrato1793200000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE contratos
      ADD COLUMN despesas_inclusas text,
      ADD COLUMN garantia varchar(30),
      ADD COLUMN tipo_caucao varchar(20),
      ADD COLUMN valor_caucao decimal(10,2)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE contratos
      DROP COLUMN despesas_inclusas,
      DROP COLUMN garantia,
      DROP COLUMN tipo_caucao,
      DROP COLUMN valor_caucao
    `);
  }
}
