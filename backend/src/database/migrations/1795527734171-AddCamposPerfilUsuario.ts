import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCamposPerfilUsuario1795527734171 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "usuarios" ALTER COLUMN "profissao" TYPE VARCHAR(150)');
    await queryRunner.query('ALTER TABLE "prestadores" ADD COLUMN "categoria_id" INTEGER');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "prestadores" DROP COLUMN "categoria_id"');
    await queryRunner.query('ALTER TABLE "usuarios" ALTER COLUMN "profissao" TYPE VARCHAR(100)');
  }
}
