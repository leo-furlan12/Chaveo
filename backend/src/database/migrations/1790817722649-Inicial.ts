import { MigrationInterface, QueryRunner } from "typeorm";

export class Inicial1790817722649 implements MigrationInterface {
    name = 'Inicial1790817722649'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "usuarios" ("id" BIGSERIAL NOT NULL, "nome" character varying(150) NOT NULL, "cpf" character varying(11) NOT NULL, "rg" character varying(20), "nacionalidade" character varying(80), "estado_civil" character varying(30), "profissao" character varying(100), "email" character varying(255) NOT NULL, "telefone" character varying(20), "senha_hash" character varying(255) NOT NULL, "data_cadastro" TIMESTAMP DEFAULT now(), CONSTRAINT "UQ_ebebcaef8457dcff6e6d69f17b0" UNIQUE ("cpf"), CONSTRAINT "UQ_446adfc18b35418aac32ae0b7b5" UNIQUE ("email"), CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "perfis" ("id" BIGSERIAL NOT NULL, "nome" character varying(50) NOT NULL, CONSTRAINT "UQ_0e08702e416f19191cde2b5ff09" UNIQUE ("nome"), CONSTRAINT "PK_7502d953951e75abea461c12741" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "usuarios_perfis" ("usuario_id" bigint NOT NULL, "perfil_id" bigint NOT NULL, CONSTRAINT "PK_41804123ad0b2825728c04234d7" PRIMARY KEY ("usuario_id", "perfil_id"))`);
        await queryRunner.query(`CREATE TABLE "permissoes" ("id" BIGSERIAL NOT NULL, "nome" character varying(100) NOT NULL, CONSTRAINT "UQ_4c7e53ca39ad887d1eb55da9bca" UNIQUE ("nome"), CONSTRAINT "PK_5a83561e7be8610760090b45c98" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "perfis_permissoes" ("perfil_id" bigint NOT NULL, "permissao_id" bigint NOT NULL, CONSTRAINT "PK_28b119cbcfccd1628f3ae9410ad" PRIMARY KEY ("perfil_id", "permissao_id"))`);
        await queryRunner.query(`CREATE TABLE "imoveis" ("id" BIGSERIAL NOT NULL, "proprietario_id" bigint NOT NULL, "cep" character varying(8) NOT NULL, "logradouro" character varying(150) NOT NULL, "numero" character varying(20) NOT NULL, "complemento" character varying(100), "bairro" character varying(100) NOT NULL, "cidade" character varying(100) NOT NULL, "estado" character(2) NOT NULL, "tipo_imovel" character varying(50) NOT NULL, "status" character varying(20) NOT NULL, CONSTRAINT "PK_618741e54874dbf5c62e2546699" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "usuarios_perfis" ADD CONSTRAINT "FK_4dd577bd5d171fce8993f12942e" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "usuarios_perfis" ADD CONSTRAINT "FK_7b319d19ebb4bf71929fb10d378" FOREIGN KEY ("perfil_id") REFERENCES "perfis"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "perfis_permissoes" ADD CONSTRAINT "FK_208f03f48f1c9afdc510c762151" FOREIGN KEY ("perfil_id") REFERENCES "perfis"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "perfis_permissoes" ADD CONSTRAINT "FK_a533afc4951e64ea998fc06a7e5" FOREIGN KEY ("permissao_id") REFERENCES "permissoes"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "imoveis" ADD CONSTRAINT "FK_04c08989715e342655ed1087009" FOREIGN KEY ("proprietario_id") REFERENCES "usuarios"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "imoveis" DROP CONSTRAINT "FK_04c08989715e342655ed1087009"`);
        await queryRunner.query(`ALTER TABLE "perfis_permissoes" DROP CONSTRAINT "FK_a533afc4951e64ea998fc06a7e5"`);
        await queryRunner.query(`ALTER TABLE "perfis_permissoes" DROP CONSTRAINT "FK_208f03f48f1c9afdc510c762151"`);
        await queryRunner.query(`ALTER TABLE "usuarios_perfis" DROP CONSTRAINT "FK_7b319d19ebb4bf71929fb10d378"`);
        await queryRunner.query(`ALTER TABLE "usuarios_perfis" DROP CONSTRAINT "FK_4dd577bd5d171fce8993f12942e"`);
        await queryRunner.query(`DROP TABLE "imoveis"`);
        await queryRunner.query(`DROP TABLE "perfis_permissoes"`);
        await queryRunner.query(`DROP TABLE "permissoes"`);
        await queryRunner.query(`DROP TABLE "usuarios_perfis"`);
        await queryRunner.query(`DROP TABLE "perfis"`);
        await queryRunner.query(`DROP TABLE "usuarios"`);
    }

}
