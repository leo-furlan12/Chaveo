import { Controller, Post, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Imovel } from '../database/entities/imovel.entity';

@Controller('imoveis') // Note que a rota será /api/imoveis por causa do prefixo global
export class ImoveisController {
  constructor(
    // Injetamos o banco de dados diretamente aqui!
    @InjectRepository(Imovel)
    private readonly imovelRepository: Repository<Imovel>,
  ) {}

  @Post()
  async criar(@Body() dados: any, @Res() res: Response) {
    try {
      // Prepara os dados que vieram do frontend
      const novoImovel = this.imovelRepository.create(dados);
      
      // Salva no PostgreSQL
      const imovelSalvo = await this.imovelRepository.save(novoImovel);
      
      // Retorna sucesso e os dados salvos
      return res.status(HttpStatus.CREATED).json({
        mensagem: 'Imóvel cadastrado com sucesso!',
        dados: imovelSalvo
      });
    } catch (erro) {
      console.error("Erro ao salvar imóvel:", erro);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        mensagem: 'Erro interno ao tentar salvar o imóvel.',
      });
    }
  }
}