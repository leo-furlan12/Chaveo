import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('usuarios')

export class Usuario {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 150 })
  nome: string;

  @Column({ type: 'varchar', length: 11, unique: true })
  cpf: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  rg: string | null;

  @Column({ type: 'varchar', length: 80, nullable: true })
  nacionalidade: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  estado_civil: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  profissao: string | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  telefone: string | null;

  @Column({ type: 'varchar', length: 255 })
  senha_hash: string;

  @Column({
  type: 'timestamp',
  nullable: true,
  default: () => 'CURRENT_TIMESTAMP',
})
data_cadastro: Date | null;
}