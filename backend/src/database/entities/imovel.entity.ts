import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';

@Entity('imoveis')
export class Imovel {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', nullable: true })
  proprietario_id: string | null;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'proprietario_id' })
  proprietario: Usuario;

  @Column({ type: 'varchar', length: 9 })
  cep: string;

  @Column({ type: 'varchar', length: 150 })
  logradouro: string;

  @Column({ type: 'varchar', length: 20 })
  numero: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  complemento: string | null;

  @Column({ type: 'varchar', length: 100 })
  bairro: string;

  @Column({ type: 'varchar', length: 100 })
  cidade: string;

  @Column({ type: 'char', length: 2 })
  estado: string;

  @Column({ type: 'varchar', length: 50 })
  tipo: string;

  @Column({ type: 'varchar', length: 20 })
  status: string;
}