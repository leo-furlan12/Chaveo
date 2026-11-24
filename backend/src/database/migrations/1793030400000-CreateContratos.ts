
import { MigrationInterface, QueryRunner } from 'typeorm';
//MigrationInterface : é uma interface do TypeORM que define a estrutura esperada de uma migration
//queryrunner = recurso do typeORM que permite executar comandos sql no banco de dados



//migration = executa alterações na estrutura do banco de dados, como criar ou modificar tabelas.
//aqui é consulta sql

// migration para criar a tabela de contratos
export class CreateContratos1793030400000 implements MigrationInterface {
//up define o que acontece quando migration é executado
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "contratos" (
        "id" BIGINT GENERATED ALWAYS AS IDENTITY,
        "imovel_id" BIGINT NOT NULL,
        "locador_id" BIGINT NOT NULL,
        "locatario_id" BIGINT,
        "status" VARCHAR(30) NOT NULL DEFAULT 'RASCUNHO',
        "valor_aluguel" DECIMAL(10,2),
        "data_inicio" DATE,
        "data_fim" DATE,
        "dia_vencimento" INTEGER,

        CONSTRAINT "contratos_pkey"
          PRIMARY KEY ("id"),

        CONSTRAINT "fk_contratos_imovel"
          FOREIGN KEY ("imovel_id")
          REFERENCES "imoveis"("id"),

        CONSTRAINT "fk_contratos_locador"
          FOREIGN KEY ("locador_id")
          REFERENCES "usuarios"("id"),

        CONSTRAINT "fk_contratos_locatario"
          FOREIGN KEY ("locatario_id")
          REFERENCES "usuarios"("id"),

        CONSTRAINT "chk_contratos_dia_vencimento"
          CHECK ("dia_vencimento" BETWEEN 1 AND 31),

        CONSTRAINT "chk_contratos_valor_aluguel"
          CHECK ("valor_aluguel" > 0),

        CONSTRAINT "chk_contratos_datas"
          CHECK ("data_fim" >= "data_inicio")
      )
    `);
  }
//down define como desfazer essa alteracao
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "contratos"`);
  }
}
