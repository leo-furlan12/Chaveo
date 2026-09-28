import {
  Entity,
  PrimaryColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

import { Usuario } from './usuario.entity';
import { Perfil } from './perfil.entity';

@Entity('usuarios_perfis')
export class UsuarioPerfil {
  @PrimaryColumn({ type: 'bigint' })
  usuario_id: string;

  @PrimaryColumn({ type: 'bigint' })
  perfil_id: string;

  @ManyToOne(() => Usuario)
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @ManyToOne(() => Perfil)
  @JoinColumn({ name: 'perfil_id' })
  perfil: Perfil;
}