import 'dotenv/config';
import { DataSource } from 'typeorm';

import { Usuario } from './entities/usuario.entity';
import { Perfil } from './entities/perfil.entity';
import { UsuarioPerfil } from './entities/usuario-perfil.entity';
import { Permissao } from './entities/permissao.entity';
import { PerfilPermissao } from './entities/perfil-permissao.entity';
import { Imovel } from './entities/imovel.entity';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,

  entities: [
    Usuario,
    Perfil,
    UsuarioPerfil,
    Permissao,
    PerfilPermissao,
    Imovel,
  ],

  migrations: ['src/database/migrations/*.ts'],

  synchronize: false,
});