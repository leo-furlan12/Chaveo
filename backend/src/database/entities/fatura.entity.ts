import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Contrato } from './contrato.entity';
import { Imovel } from './imovel.entity';
import { Usuario } from './usuario.entity';

@Entity('faturas')
export class Fatura {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  // Vínculo ao contrato que originou a cobrança. Os outros vínculos são
  // mantidos diretamente na fatura para facilitar consultas e preservar
  // quem eram as partes e qual imóvel estavam associados à parcela.
  @Column({ type: 'bigint' })
  contrato_id: string;

  @ManyToOne(() => Contrato, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'contrato_id' })
  contrato: Contrato;

  @Column({ type: 'bigint' })
  imovel_id: string;

  @ManyToOne(() => Imovel, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'imovel_id' })
  imovel: Imovel;

  @Column({ type: 'bigint' })
  locatario_id: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'locatario_id' })
  locatario: Usuario;

  @Column({ type: 'bigint' })
  locador_id: string;

  @ManyToOne(() => Usuario, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'locador_id' })
  locador: Usuario;

  // ID único retornado pelo Asaas. Nullable para registros ainda não enviados
  // ao gateway e único para impedir duplicação da mesma cobrança.
  @Column({ type: 'varchar', length: 80, nullable: true, unique: true })
  asaas_payment_id: string | null;

  // Mantemos um status para distinguir pendente, paga, vencida e cancelada.
  // `pago` é derivado do status no PostgreSQL, evitando duas fontes de verdade.
  @Column({ type: 'varchar', length: 30, default: 'PENDENTE' })
  status: string;

  @Column({
    type: 'boolean',
    asExpression: `"status" IN ('PAGO', 'CONFIRMADO', 'RECEBIDO', 'CONFIRMED', 'RECEIVED')`,
    generatedType: 'STORED',
  })
  pago: boolean;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  valor: string;

  @Column({ type: 'date' })
  data_vencimento: string;

  @Column({ type: 'text', nullable: true })
  boleto_pdf_url: string | null;

  // Salva somente o payload Pix (copia e cola), nunca a imagem Base64 do QR.
  @Column({ type: 'text', nullable: true })
  pix_copia_e_cola: string | null;

  @Column({ type: 'timestamp', nullable: true })
  data_pagamento: Date | null;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  criado_em: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  atualizado_em: Date;
}
