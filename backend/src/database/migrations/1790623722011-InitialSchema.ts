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
        "data_cadastro" TIMESTAMP DEFAULT now(),
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

        CONSTRAINT "FK_4dd577bd5d171fce8993f12942e"
          FOREIGN KEY ("usuario_id")
          REFERENCES "usuarios"("id"),

        CONSTRAINT "FK_7b319d19ebb4bf71929fb10d378"
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

        CONSTRAINT "FK_208f03f48f1c9afdc510c762151"
          FOREIGN KEY ("perfil_id")
          REFERENCES "perfis"("id"),

        CONSTRAINT "FK_a533afc4951e64ea998fc06a7e5"
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

        CONSTRAINT "FK_04c08989715e342655ed1087009"
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