import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Fatura } from './fatura.entity';

@Entity('repasses')
export class Repasse {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'bigint', unique: true })
  fatura_id: string;

  @ManyToOne(() => Fatura, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'fatura_id' })
  fatura: Fatura;

  @Column({ type: 'varchar', length: 80, nullable: true, unique: true })
  asaas_transfer_id: string | null;

  @Column({ type: 'varchar', length: 80, unique: true })
  referencia_externa: string;

  @Column({ type: 'varchar', length: 30, default: 'AGUARDANDO' })
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: string;

  @Column({ type: 'text', nullable: true })
  motivo_falha: string | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  criado_em: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  atualizado_em: Date;
}
