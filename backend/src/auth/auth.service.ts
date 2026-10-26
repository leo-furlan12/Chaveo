import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginDto } from './dto/login.dto'
import { InjectRepository } from '@nestjs/typeorm';

import { Repository } from 'typeorm'; //pega da biblioteca typeORM
import { Usuario } from '../database/entities/usuario.entity';
import * as bcrypt from 'bcrypt'; //biblioteca que faz hash
import { JwtService } from '@nestjs/jwt'; //token
//arquivo que entrega dados recebidos para a busca de dados em conexão com postgree e verifica se estão corretos

//postgree chama TypeORM(evita constantes consultas sql)

@Injectable()
export class AuthService {

  constructor(
    @InjectRepository(Usuario) //referente ao repositorio da entidade usuario
    private readonly usuarioRepository: Repository<Usuario>,// guarda o repositorio dentro do service
    private readonly jwtService: JwtService, // usa token 
  ) { }

  async login(dados: LoginDto) {//funcao para logica do login
    //async = funcao assincrona = funcao pode demorar 
    //await = epera a consulta terminar p/ ir para outra linha

    const usuario = await this.usuarioRepository.findOne({ // guarda resultado da busca no repositorio do usuario 
      //findOne = busque um usuario
      where: { // condicao
        cpf: dados.cpf,
      },
    });
    if (!usuario) {
      throw new UnauthorizedException('CPF ou senha inválidos'); //interrompe login e o nest responde 401
    }
    const senhaValida = await bcrypt.compare( //compara a senha vinda usando hash
      dados.senha,
      usuario.senha_hash,
    );

    if (!senhaValida) {
      throw new UnauthorizedException('CPF ou senha inválidos');
    }
    const payload = {
      sub: usuario.id, //jwt carrega claims
      //sub = subject = usado para identificar de quem é o token
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      message: 'Login realizado com sucesso',
      access_token: accessToken,
    };
  }

}