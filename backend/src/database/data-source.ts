//arquivo que configura conexao de type com o banco

import 'dotenv/config';
import { DataSource } from 'typeorm';
import { Contrato } from './entities/contrato.entity';
import { Usuario } from './entities/usuario.entity';
import { Perfil } from './entities/perfil.entity';
import { UsuarioPerfil } from './entities/usuario-perfil.entity';
import { Permissao } from './entities/permissao.entity';
import { PerfilPermissao } from './entities/perfil-permissao.entity';
import { Imovel } from './entities/imovel.entity';

export const AppDataSource = new DataSource({
  type: 'postgres', //tipo de banco
  host: process.env.DB_HOST, //endereço do servidor do banco
  port: Number(process.env.DB_PORT),//porta ultilizada cna conexao
  username: process.env.DB_USERNAME,//usaurio do postgresql
  password: process.env.DB_PASSWORD,//senha do usuario
  database: process.env.DB_DATABASE,//nome do banco de dados
//process.ev = permite acessar variavesi de ambiente
//busca valores configuradas no ambiente (docker definiu)


//reconhecer entidades
  entities: [
    Usuario,
    Perfil,
    UsuarioPerfil,
    Permissao,
    PerfilPermissao,
    Imovel,
    Contrato,
  ],

  migrations: ['src/database/migrations/*.ts'],

  synchronize: false, //desativa sincronização automatica
});