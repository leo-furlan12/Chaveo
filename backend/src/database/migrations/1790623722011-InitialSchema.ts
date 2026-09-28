import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1790623722011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "usuarios" (
        "id" BIGINT GENERATED ALWAYS AS IDENTITY,
        "nome" VARCHAR(150) NOT NULL,
        "cpf" VARCHAR(11) NOT NULL,
        "rg" VARCHAR(20),
        "nacionalidade" VARCHAR(80),
        "estado_civil" VARCHAR(30),
        "profissao" VARCHAR(100),
        "email" VARCHAR(255) NOT NULL,
        "telefone" VARCHAR(20),
        "senha_hash" VARCHAR(255) NOT NULL,
        "data_cadastro" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "usuarios_cpf_key" UNIQUE ("cpf"),
        CONSTRAINT "usuarios_email_key" UNIQUE ("email")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "perfis" (
        "id" BIGINT GENERATED ALWAYS AS IDENTITY,
        "nome" VARCHAR(50) NOT NULL,
        CONSTRAINT "perfis_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "perfis_nome_key" UNIQUE ("nome")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "permissoes" (
        "id" BIGINT GENERATED ALWAYS AS IDENTITY,
        "nome" VARCHAR(100) NOT NULL,
        CONSTRAINT "permissoes_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "permissoes_nome_key" UNIQUE ("nome")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "usuarios_perfis" (
        "usuario_id" BIGINT NOT NULL,
        "perfil_id" BIGINT NOT NULL,

        CONSTRAINT "usuarios_perfis_pkey"
          PRIMARY KEY ("usuario_id", "perfil_id"),

        CONSTRAINT "usuarios_perfis_usuario_id_fkey"
          FOREIGN KEY ("usuario_id")
          REFERENCES "usuarios"("id"),

        CONSTRAINT "usuarios_perfis_perfil_id_fkey"
          FOREIGN KEY ("perfil_id")
          REFERENCES "perfis"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "perfis_permissoes" (
        "perfil_id" BIGINT NOT NULL,
        "permissao_id" BIGINT NOT NULL,

        CONSTRAINT "perfis_permissoes_pkey"
          PRIMARY KEY ("perfil_id", "permissao_id"),

        CONSTRAINT "perfis_permissoes_perfil_id_fkey"
          FOREIGN KEY ("perfil_id")
          REFERENCES "perfis"("id"),

        CONSTRAINT "perfis_permissoes_permissao_id_fkey"
          FOREIGN KEY ("permissao_id")
          REFERENCES "permissoes"("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "imoveis" (
        "id" BIGINT GENERATED ALWAYS AS IDENTITY,
        "proprietario_id" BIGINT NOT NULL,
        "cep" VARCHAR(8) NOT NULL,
        "logradouro" VARCHAR(150) NOT NULL,
        "numero" VARCHAR(20) NOT NULL,
        "complemento" VARCHAR(100),
        "bairro" VARCHAR(100) NOT NULL,
        "cidade" VARCHAR(100) NOT NULL,
        "estado" CHAR(2) NOT NULL,
        "tipo_imovel" VARCHAR(50) NOT NULL,
        "status" VARCHAR(20) NOT NULL,

        CONSTRAINT "imoveis_pkey"
          PRIMARY KEY ("id"),

        CONSTRAINT "imoveis_proprietario_id_fkey"
          FOREIGN KEY ("proprietario_id")
          REFERENCES "usuarios"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "imoveis"`);
    await queryRunner.query(`DROP TABLE "perfis_permissoes"`);
    await queryRunner.query(`DROP TABLE "usuarios_perfis"`);
    await queryRunner.query(`DROP TABLE "permissoes"`);
    await queryRunner.query(`DROP TABLE "perfis"`);
    await queryRunner.query(`DROP TABLE "usuarios"`);
  }
}