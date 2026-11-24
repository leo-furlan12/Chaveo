import {
  Controller, Post, Body, Get,
  UseGuards,
  Req
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { AuthService } from './auth.service';
import { AuthGuard } from './auth.guard';
import { Request } from 'express';


//arquivo onde recebe os dados do frontend
@Controller('auth')//cuida das requisições que começa com auth

export class AuthController {

  constructor(private readonly authService: AuthService) { }//injeção de dependência, disponibiliza para o controller o authservice, nest responde entregando o providers que tem o authservice

  @Post('login') //post = envio de dados de login
  //body = pega o conteudo dentro da requisição
  //dados = guarda os dados recebidos
  //loginDto = componente do arquivo login.dto 
  //arquvio login.dto = ficha com variaveis do tipo dos dados que se espera receber 
  login(@Body() dados: LoginDto) { //Os dados que chegarem aqui devem ter o formato de um LoginDto

    return this.authService.login(dados);    //executar metodo login do authservice levando os dados recebidos
  }
  //post /auth/login
  @Get('perfil')
  @UseGuards(AuthGuard)
  perfil(@Req() request: Request) {
    return {
      message: 'Você está autenticado',
      user: (request as any).user,
    };
  }

}