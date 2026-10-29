import { Controller, Post, Get, Body, Res, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Imovel } from '../database/entities/imovel.entity';

@Controller('imoveis')
export class ImoveisController {
  constructor(
    @InjectRepository(Imovel)
    private readonly imovelRepository: Repository<Imovel>,
  ) {}

  // Rota GET para listar os imóveis na Dashboard
  @Get()
  async listar(@Res() res: Response) {
    try {
      const imoveis = await this.imovelRepository.find();
      return res.status(HttpStatus.OK).json(imoveis);
    } catch (erro) {
      console.error("Erro ao listar imóveis:", erro);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        mensagem: 'Erro ao buscar imóveis.',
      });
    }
  }

  // Rota POST para cadastrar novos imóveis
  @Post()
  async criar(@Body() dados: any, @Res() res: Response) {
    try {
      const novoImovel = this.imovelRepository.create(dados);
      const imovelSalvo = await this.imovelRepository.save(novoImovel);
      
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