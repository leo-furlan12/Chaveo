import {
  Entity,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Perfil } from './perfil.entity';
import { Permissao } from './permissao.entity';

@Entity('perfis_permissoes')
export class PerfilPermissao {
  @PrimaryColumn({ type: 'bigint' })
  perfil_id: string;

  @PrimaryColumn({ type: 'bigint' })
  permissao_id: string;

  @ManyToOne(() => Perfil)
  @JoinColumn({ name: 'perfil_id' })
  perfil: Perfil;

  @ManyToOne(() => Permissao)
  @JoinColumn({ name: 'permissao_id' })
  permissao: Permissao;
}