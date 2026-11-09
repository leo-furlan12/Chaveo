import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Res,
  HttpStatus,
} from '@nestjs/common';
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

  // 1. Rota GET para listar todos os imóveis na Dashboard
  @Get()
  async listar(@Res() res: Response) {
    try {
      const imoveis = await this.imovelRepository.find({
        order: { id: 'DESC' },
      });
      return res.status(HttpStatus.OK).json(imoveis);
    } catch (erro) {
      console.error('Erro ao listar imóveis:', erro);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        mensagem: 'Erro ao buscar imóveis.',
      });
    }
  }

  // 2. Rota GET por ID para carregar os dados na tela de edição
  @Get(':id')
  async buscarPorId(@Param('id') id: string, @Res() res: Response) {
    try {
      const imovel = await this.imovelRepository.findOne({ where: { id } });
      if (!imovel) {
        return res.status(HttpStatus.NOT_FOUND).json({
          mensagem: 'Imóvel não encontrado.',
        });
      }
      return res.status(HttpStatus.OK).json(imovel);
    } catch (erro) {
      console.error('Erro ao buscar imóvel:', erro);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        mensagem: 'Erro ao buscar detalhes do imóvel.',
      });
    }
  }

  // 3. Rota POST para cadastrar novos imóveis
  @Post()
  async criar(@Body() dados: any, @Res() res: Response) {
    try {
      const payload = {
        ...dados,
        proprietario_id: dados.proprietario_id || '1',
        status: dados.status || 'Disponivel',
      };
      const novoImovel = this.imovelRepository.create(payload);
      const imovelSalvo = await this.imovelRepository.save(novoImovel);

      return res.status(HttpStatus.CREATED).json({
        mensagem: 'Imóvel cadastrado com sucesso!',
        dados: imovelSalvo,
      });
    } catch (erro) {
      console.error('Erro ao salvar imóvel:', erro);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        mensagem: 'Erro interno ao tentar salvar o imóvel.',
      });
    }
  }

  // 4. Rota PATCH para editar o imóvel (COM REGRA DE NEGÓCIO)
  @Patch(':id')
  async atualizar(
    @Param('id') id: string,
    @Body() dados: any,
    @Res() res: Response,
  ) {
    try {
      const imovelExistente = await this.imovelRepository.findOne({
        where: { id },
      });

      if (!imovelExistente) {
        return res.status(HttpStatus.NOT_FOUND).json({
          mensagem: 'Imóvel não encontrado.',
        });
      }

      // REGRA DE NEGÓCIO: Proibido alterar dados se o imóvel estiver ALUGADO
      if (imovelExistente.status?.toUpperCase() === 'ALUGADO') {
        return res.status(HttpStatus.FORBIDDEN).json({
          mensagem:
            'Regra de negócio: Não é permitido alterar informações de um imóvel que está Alugado.',
        });
      }

      Object.assign(imovelExistente, dados);
      const imovelAtualizado = await this.imovelRepository.save(imovelExistente);

      return res.status(HttpStatus.OK).json({
        mensagem: 'Imóvel atualizado com sucesso!',
        dados: imovelAtualizado,
      });
    } catch (erro) {
      console.error('Erro ao atualizar imóvel:', erro);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        mensagem: 'Erro interno ao tentar atualizar o imóvel.',
      });
    }
  }

  // 5. Rota DELETE para excluir o imóvel direto
  @Delete(':id')
  async excluir(@Param('id') id: string, @Res() res: Response) {
    try {
      const resultado = await this.imovelRepository.delete(id);
      if (resultado.affected === 0) {
        return res.status(HttpStatus.NOT_FOUND).json({
          mensagem: 'Imóvel não encontrado para exclusão.',
        });
      }
      return res.status(HttpStatus.OK).json({
        mensagem: 'Imóvel excluído com sucesso!',
      });
    } catch (erro) {
      console.error('Erro ao excluir imóvel:', erro);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        mensagem: 'Erro interno ao tentar excluir o imóvel.',
      });
    }
  }
}