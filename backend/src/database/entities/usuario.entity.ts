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

  // Um usuário pode ser inquilino em vários contratos; guardar o Customer ID
  // aqui evita cadastrar a mesma pessoa repetidamente no Asaas.
  @Column({ type: 'varchar', length: 80, nullable: true, unique: true })
  asaas_customer_id: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  recebimento_tipo: string | null;

  // Dados pessoais e bancários são armazenados cifrados pela aplicação.
  @Column({ type: 'text', nullable: true })
  recebimento_pix_chave_cifrada: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  recebimento_pix_tipo: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  recebimento_banco_codigo: string | null;

  @Column({ type: 'text', nullable: true })
  recebimento_banco_agencia_cifrada: string | null;

  @Column({ type: 'text', nullable: true })
  recebimento_banco_agencia_digito_cifrado: string | null;

  @Column({ type: 'text', nullable: true })
  recebimento_banco_conta_cifrada: string | null;

  @Column({ type: 'text', nullable: true })
  recebimento_banco_conta_digito_cifrado: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  recebimento_banco_tipo_conta: string | null;

  @Column({ type: 'varchar', length: 3, nullable: true })
  recebimento_banco_operacao: string | null;

  @Column({ type: 'text', nullable: true })
  recebimento_titular_nome_cifrado: string | null;

  @Column({ type: 'text', nullable: true })
  recebimento_titular_documento_cifrado: string | null;

  @Column({ type: 'varchar', length: 255 })
  senha_hash: string;

  @Column({
  type: 'timestamp',
  nullable: true,
  default: () => 'CURRENT_TIMESTAMP',
})
data_cadastro: Date | null;
}
