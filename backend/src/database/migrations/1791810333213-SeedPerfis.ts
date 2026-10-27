import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedPerfis1791810333213 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO "perfis" ("nome") 
            VALUES ('PROPRIETARIO'), ('INQUILINO'), ('PRESTADOR')
            ON CONFLICT ("nome") DO NOTHING;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM "perfis" 
            WHERE "nome" IN ('PROPRIETARIO', 'INQUILINO', 'PRESTADOR');
        `);
    }

}
