import { Controller, Post, Get, Param, Body, Res, HttpStatus } from '@nestjs/common';
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
  ) { }

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

  @Get(':id')
  async buscarPorId(@Param('id') id: string, @Res() res: Response) {
    try {
      // busca o imóvel pelo id
      const imovel = await this.imovelRepository.findOne({
        where: { id: id },
      });

      // verifica se o imóvel existe
      if (!imovel) {
        return res.status(HttpStatus.NOT_FOUND).json({
          mensagem: 'Imóvel não encontrado.',
        });
      }

      // retorna os dados do imóvel
      return res.status(HttpStatus.OK).json(imovel);
    } catch (erro) {
      console.error('Erro ao buscar imóvel:', erro);

      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        mensagem: 'Erro ao buscar imóvel.',
      });
    }
  }

}