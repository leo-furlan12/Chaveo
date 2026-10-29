
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';
import { Imovel } from './imovel.entity';

@Entity('contratos')
export class Contrato {//representa tabela do banco de dados

  //column = define colunas da tabela e suas propriedades

  // id unico de cada contrato
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string; 

  // imovel que sera alugado
    // id do imovel associado ao contrato

  @Column({ type: 'bigint' })
  imovel_id: string;

  @ManyToOne(() => Imovel) //cria relacionamento entre tabelas(entidades, Contratos e Imovel), manytoone = varios contratos associados ao mesmo contrato
  @JoinColumn({ name: 'imovel_id' })// o que liga o relacionamento é a coluna de imovel_id
  imovel: Imovel //representa o relacionamento

  // proprietario responsavel pelo contrato
  @Column({ type: 'bigint' })
  locador_id: string;

  @ManyToOne(() => Usuario)//varios contratos pode associar a um usuario
  @JoinColumn({ name: 'locador_id' })//
  locador: Usuario; //representacao Usuario com Contrato

  // inquilino pode ser associado depois
  @Column({ type: 'bigint', nullable: true })
  locatario_id: string | null;

  // cpf do inquilino indicado pelo proprietario
@Column({ type: 'varchar', length: 11, nullable: true })
cpf_locatario: string | null;

  @ManyToOne(() => Usuario, { nullable: true })//varios contratos pode ter varios usuarios tipo locatario
  @JoinColumn({ name: 'locatario_id' })
  locatario: Usuario | null;//locatario pode ser nulo por uqe coloca locatario depois

  // situacao atual do cadastro
  @Column({ type: 'varchar', length: 30, default: 'RASCUNHO' })
  status: string;

  // valor mensal do aluguel
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true }) //scale permite separar dois dos 10 digitos maximos como casas decimais
  valor_aluguel: string | null; 

  // periodo do contrato
  @Column({ type: 'date', nullable: true })
  data_inicio: string | null;

  @Column({ type: 'date', nullable: true })
  data_fim: string | null;

  // dia do mes em que o aluguel vence
  @Column({ type: 'int', nullable: true })
  dia_vencimento: number | null;

  @Column({ type: 'varchar', length: 64, nullable: true, unique: true })
  convite_token: string | null; //guarda codigo unico para convite

  // despesas inclusas no valor do aluguel
@Column({ type: 'simple-array', nullable: true })
despesas_inclusas: string[] | null;

// tipo de garantia do contrato
@Column({ type: 'varchar', length: 30, nullable: true })
garantia: string | null;

// tipo de caucao escolhida
@Column({ type: 'varchar', length: 20, nullable: true })
tipo_caucao: string | null;

// valor da caucao
@Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
valor_caucao: string | null;

  // dados do fiador
  @Column({ type: 'varchar', length: 150, nullable: true })
  fiador_nome: string | null;

  @Column({ type: 'varchar', length: 11, nullable: true })
  fiador_cpf: string | null;

  @Column({ type: 'text', nullable: true })
  fiador_qualificacao: string | null;

  @Column({ type: 'text', nullable: true })
  fiador_imovel: string | null;

  // dados do seguro fianca
  @Column({ type: 'varchar', length: 150, nullable: true })
  seguro_seguradora: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  seguro_apolice: string | null;

  // indice escolhido para reajustar o aluguel
@Column({ type: 'varchar', length: 10, nullable: true })
indice_reajuste: string | null;

// caminho do pdf assinado enviado pelo proprietario
@Column({ type: 'varchar', length: 255, nullable: true })
pdf_assinado_path: string | null;
}


