import { MigrationInterface, QueryRunner } from "typeorm";

export class CreatePrestador1791823027675 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
        CREATE TABLE IF NOT EXISTS prestadores (
            id BIGSERIAL PRIMARY KEY,
            usuario_id BIGINT NOT NULL UNIQUE,
            descricao TEXT,
            cidade VARCHAR(100),
            estado VARCHAR(2),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fk_prestadores_usuario
            FOREIGN KEY (usuario_id)
            REFERENCES usuarios(id)
            ON DELETE CASCADE
        );
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS prestadores CASCADE;`);
    }

}
