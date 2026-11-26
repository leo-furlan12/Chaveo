import { Controller, Post, Get, Param, Patch, Delete, Body, Res, HttpStatus, Req } from '@nestjs/common';
import { Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Imovel } from '../database/entities/imovel.entity';
import { Contrato } from '../database/entities/contrato.entity';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';

@Controller('imoveis')
export class ImoveisController {
  constructor(
    @InjectRepository(Imovel)
    private readonly imovelRepository: Repository<Imovel>,
  ) { }

  // 1. Rota GET para listar todos os imóveis na Dashboard
  @Get()
  @UseGuards(AuthGuard)
  async listar(@Req() req: Request, @Res() res: Response) {
      try {
        const proprietarioId = String((req as any).user.sub);

      const imoveis = await this.imovelRepository.find({
        where: { proprietario_id: proprietarioId, excluido_em: IsNull() },
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
 // @UseGuards(AuthGuard)
  async buscarPorId(@Param('id') id: string, @Res() res: Response) {
    try {
      const imovel = await this.imovelRepository.findOne({ where: { id, excluido_em: IsNull() } });
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

  // Rota POST para cadastrar novos imóveis
  @Post()
@UseGuards(AuthGuard)
async criar(@Body() dados: any, @Req() req: Request, @Res() res: Response) {
  try {
    const usuarioId = String((req as any).user.sub);
    const { id, proprietario_id, proprietario, excluido_em, ...dadosLimpos } = dados;

    const novoImovel = this.imovelRepository.create({
      ...dadosLimpos,
      proprietario_id: usuarioId,
      status: dados.status || 'Disponível',
    });
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


  
    // rota PATCH para editar o imóvel (COM REGRA DE NEGÓCIO)
  @Patch(':id')
  async atualizar(
    @Param('id') id: string,
    @Body() dados: any,
    @Res() res: Response,
  ) {
    try {
      const resultado = await this.imovelRepository.manager.transaction(async (manager) => {
        const imovelExistente = await manager.findOne(Imovel, {
          where: { id, excluido_em: IsNull() },
          lock: { mode: 'pessimistic_write' },
        });

        if (!imovelExistente) {
          return {
            status: HttpStatus.NOT_FOUND,
            resposta: { mensagem: 'Imóvel não encontrado.' },
          };
        }
        // REGRA DE NEGÓCIO: Proibido alterar dados se o imóvel estiver ALUGADO
        if (imovelExistente.status?.toUpperCase() === 'ALUGADO') {
          return {
            status: HttpStatus.FORBIDDEN,
            resposta: {
              mensagem: 'Regra de negócio: Não é permitido alterar informações de um imóvel que está Alugado.',
            },
          };
        }

        const { id: _id, proprietario_id, proprietario, excluido_em, ...dadosLimpos } = dados;

        Object.assign(imovelExistente, dadosLimpos);
        const imovelAtualizado = await manager.save(Imovel, imovelExistente);

        return {
          status: HttpStatus.OK,
          resposta: { mensagem: 'Imóvel atualizado com sucesso!', dados: imovelAtualizado },
        };
      });
      return res.status(resultado.status).json(resultado.resposta);
    } catch (erro) {
      console.error('Erro ao atualizar imóvel:', erro);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        mensagem: 'Erro interno ao tentar atualizar o imóvel.',
      });
    }
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async excluir(@Param('id') id: string, @Req() req: Request, @Res() res: Response) {
    if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > 9223372036854775807n) {
      return res.status(HttpStatus.BAD_REQUEST).json({ mensagem: 'Imóvel inválido.' });
    }

    const proprietarioId = String((req as any).user.sub);
    const filtroImovel = { id, proprietario_id: proprietarioId, excluido_em: IsNull() };

    try {
      const resultado = await this.imovelRepository.manager.transaction(async (manager) => {
        const imovel = await manager.findOne(Imovel, {
          where: filtroImovel,
          lock: { mode: 'pessimistic_write' },
        });
        if (!imovel) {
          return {
            status: HttpStatus.NOT_FOUND,
            resposta: { mensagem: 'Imóvel não encontrado para exclusão.' },
          };
        }

        const contratos = await manager.getRepository(Contrato)
          .createQueryBuilder('contrato')
          .select('contrato.status', 'status')
          .addSelect("contrato.data_fim IS NULL OR contrato.data_fim >= (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date", 'dentro_da_vigencia')
          .where('contrato.imovel_id = :id', { id })
          .getRawMany<{ status: string; dentro_da_vigencia: boolean }>();

        const emAndamento = [
          'RASCUNHO', 'AGUARDANDO_INQUILINO', 'PENDENTE_DADOS',
          'AGUARDANDO_REVISAO', 'AGUARDANDO_ASSINATURAS',
        ];
        if (contratos.some(({ status, dentro_da_vigencia }) =>
          emAndamento.includes(status) || status === 'ATIVO' ||
          (status === 'CONCLUIDO' && dentro_da_vigencia),
        )) {
          return {
            status: HttpStatus.CONFLICT,
            resposta: { mensagem: 'Não é possível excluir um imóvel com contrato ativo ou em andamento.' },
          };
        }

        await manager.update(Imovel, filtroImovel, { excluido_em: new Date() });
        return {
          status: HttpStatus.OK,
          resposta: { mensagem: 'Imóvel removido da carteira.' },
        };
      });
      return res.status(resultado.status).json(resultado.resposta);
    } catch (erro) {
      console.error('Erro ao excluir imóvel:', erro);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        mensagem: 'Erro interno ao tentar excluir o imóvel.',
      });
    }
  }
}
