import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedPerfisCadastro1793293200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO "perfis" ("nome")
      VALUES ('INQUILINO'), ('PROPRIETARIO'), ('PRESTADOR')
      ON CONFLICT ("nome") DO NOTHING
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DELETE FROM "perfis"
      WHERE "nome" IN ('INQUILINO', 'PROPRIETARIO', 'PRESTADOR')
    `);
  }
}
