import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddExclusaoLogicaImovel1795527734172 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "imoveis" ADD COLUMN "excluido_em" TIMESTAMPTZ');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "imoveis" DROP COLUMN "excluido_em"');
  }
}
