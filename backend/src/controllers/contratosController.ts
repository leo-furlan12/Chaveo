
import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
//controller recebe requisisções http e encaminha


import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Contrato } from '../database/entities/contrato.entity';
import { Imovel } from '../database/entities/imovel.entity';
import { AuthGuard } from '../auth/auth.guard';
import { Param } from '@nestjs/common'; //receber id do contrato por url
import { randomBytes } from 'crypto'; // gera codigo aleatorio para convite
import { Usuario } from '../database/entities/usuario.entity';

@Controller('contratos') //recebe solicitaçoes de cadastro de um contrato
export class ContratosController {
  constructor(
    @InjectRepository(Contrato)
    private readonly contratoRepository: Repository<Contrato>,

    @InjectRepository(Imovel)
    private readonly imovelRepository: Repository<Imovel>,

    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>, //consultar usuarios no postgree
  ) { }

  @Post()
  @UseGuards(AuthGuard) //passa pela verificação
  async criar(@Body() dados: any, @Req() request: Request) {
    // pega o usuario logado pelo token
    const usuarioId = (request as any).user.sub;

    // verifica se o id do imovel foi informado
    if (!dados || !dados.imovel_id) {
      throw new BadRequestException('Informe o imóvel');
    }

    // procura o imovel no banco
    const imovel = await this.imovelRepository.findOne({
      where: { id: dados.imovel_id },
    });

    // verifica se o imovel existe
    if (!imovel) {
      throw new NotFoundException('Imóvel não encontrado');
    }

    // verifica se o imovel pertence ao usuario
    if (String(imovel.proprietario_id) !== String(usuarioId)) {
      throw new ForbiddenException('Este imóvel não pertence a você');
    }

    // pega os dados do aluguel
    const {
      valor_aluguel,
      data_inicio,
      data_fim,
      dia_vencimento,
      cpf_locatario,
      despesas_inclusas,
      garantia,
      tipo_caucao,
      valor_caucao,
    } = dados;

    // verifica se todos os campos foram preenchidos
    if (
      valor_aluguel == null ||
      !data_inicio ||
      !data_fim ||
      dia_vencimento == null || cpf_locatario == null
    ) {
      throw new BadRequestException('Preencha todos os dados do contrato');
    }

    // verifica o valor do aluguel
    if (
      typeof valor_aluguel !== 'number' ||
      !Number.isFinite(valor_aluguel) ||
      valor_aluguel <= 0
    ) {
      throw new BadRequestException('Valor do aluguel inválido');
    }

    // verifica o dia do vencimento
    if (
      !Number.isInteger(dia_vencimento) ||
      dia_vencimento < 1 ||
      dia_vencimento > 31
    ) {
      throw new BadRequestException('Dia de vencimento inválido');
    }

    // verifica se as datas sao validas
    const dataValida = (data: unknown) => {
      if (typeof data !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
        return false;
      }

      const dataConvertida = new Date(`${data}T00:00:00Z`);

      return (
        !Number.isNaN(dataConvertida.getTime()) &&
        dataConvertida.toISOString().slice(0, 10) === data
      );
    };

    if (!dataValida(data_inicio) || !dataValida(data_fim)) {
      throw new BadRequestException('Data inválida');
    }

    // verifica se a data final vem depois da inicial
    if (data_fim < data_inicio) {
      throw new BadRequestException(
        'A data final não pode ser anterior à inicial',
      );
    }
    // verifica se o cpf do inquilino foi informado corretamente
    if (
      typeof cpf_locatario !== 'string' ||
      !/^\d{11}$/.test(cpf_locatario)
    ) {
      throw new BadRequestException(
        'O CPF do inquilino deve conter 11 números',
      );
    }
    // procura o usuario que esta criando o contrato
    const proprietario = await this.usuarioRepository.findOne({
      where: { id: String(usuarioId) },
    });

    // impede que o proprietario indique o proprio cpf
    if (proprietario?.cpf === cpf_locatario) {
      throw new BadRequestException(
        'O proprietário não pode ser o inquilino do próprio contrato',
      );
    }
    // verifica as despesas selecionadas
    const despesasPermitidas = [
      'agua',
      'luz',
      'internet',
      'gas',
      'condominio',
      'iptu',
    ];

    if (
      !Array.isArray(despesas_inclusas) ||
      !despesas_inclusas.every(
        (despesa) => despesasPermitidas.includes(despesa)
      )
    ) {
      throw new BadRequestException('Despesas inválidas');
    }

    // verifica a garantia escolhida
    const garantiasPermitidas = ['fiador', 'seguro', 'caucao', 'nenhuma'];

    if (!garantiasPermitidas.includes(garantia)) {
      throw new BadRequestException('Garantia inválida');
    }

    // calcula o valor da caucao
    let valorCaucaoFinal: string | null = null;
    let tipoCaucaoFinal: string | null = null;

    if (garantia === 'caucao') {
      if (!['2', '3', 'negociado'].includes(tipo_caucao)) {
        throw new BadRequestException('Tipo de caução inválido');
      }

      tipoCaucaoFinal = tipo_caucao;

      if (tipo_caucao === 'negociado') {
        if (
          typeof valor_caucao !== 'number' ||
          !Number.isFinite(valor_caucao) ||
          valor_caucao <= 0 ||
          valor_caucao > valor_aluguel * 3
        ) {
          throw new BadRequestException('Valor da caução inválido');
        }

        valorCaucaoFinal = valor_caucao.toFixed(2);
      } else {
        valorCaucaoFinal = (valor_aluguel * Number(tipo_caucao)).toFixed(2);
      }
    }
    // cria o contrato com os dados recebidos
    const contrato = this.contratoRepository.create({
      imovel_id: imovel.id,
      locador_id: String(usuarioId),
      locatario_id: null,
      status: 'RASCUNHO',
      valor_aluguel: valor_aluguel.toFixed(2),
      data_inicio: data_inicio,
      data_fim: data_fim,
      dia_vencimento: dia_vencimento,
      cpf_locatario: cpf_locatario,
      despesas_inclusas: despesas_inclusas,
      garantia: garantia,
      tipo_caucao: tipoCaucaoFinal,
      valor_caucao: valorCaucaoFinal,
    });

    // salva o contrato no banco
    const contratoSalvo = await this.contratoRepository.save(contrato);

    return {
      mensagem: 'Contrato criado com sucesso',
      contrato: contratoSalvo,
    };
  }

  //rota para criar convite :
  @Post(':id/convite') //rota para esse metodo
  @UseGuards(AuthGuard)
  async gerarConvite(@Param('id') id: string, @Req() request: Request) {
    // pega o usuario logado
    const usuarioId = (request as any).user.sub;

    // procura o contrato pelo id
    const contrato = await this.contratoRepository.findOne({
      where: { id },
    });

    // verifica se o contrato existe
    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado');
    }

    // verifica se o usuario é o locador
    if (String(contrato.locador_id) !== String(usuarioId)) {
      throw new ForbiddenException('Você não pode gerar convite para este contrato');
    }

    // permite gerar convite apenas na etapa correta
    if (
      contrato.status !== 'RASCUNHO' &&
      contrato.status !== 'AGUARDANDO_INQUILINO'
    ) {
      throw new BadRequestException('Este contrato não permite gerar convite');
    }

    // gera o codigo apenas se ainda nao existir
    if (!contrato.convite_token) {
      contrato.convite_token = randomBytes(32).toString('hex');
    }

    // atualiza o andamento do contrato
    contrato.status = 'AGUARDANDO_INQUILINO';

    // salva as alteracoes no banco
    await this.contratoRepository.save(contrato);

    return {
      mensagem: 'Convite gerado com sucesso',
      convite_token: contrato.convite_token,
      status: contrato.status,
    };
  }

  @Post('convite/:token/aceitar')
  @UseGuards(AuthGuard)
  async aceitarConvite(
    @Param('token') token: string,
    @Req() request: Request,
  ) {
    // pega o usuario logado pela url
    const usuarioId = String((request as any).user.sub);

    // procura o contrato pelo codigo do convite
    const contrato = await this.contratoRepository.findOne({
      where: { convite_token: token },
    });

    // verifica se o convite existe
    if (!contrato) {
      throw new NotFoundException('Convite não encontrado');
    }

    // verifica se o contrato esta aguardando o inquilino
    if (contrato.status !== 'AGUARDANDO_INQUILINO') {
      throw new BadRequestException('Este convite não está disponível');
    }

    // impede que o proprietario seja o proprio inquilino
    if (String(contrato.locador_id) === usuarioId) {
      throw new ForbiddenException(
        'O proprietário não pode aceitar o próprio convite',
      );
    }

    // impede associar outro inquilino a um contrato ja ocupado
    if (contrato.locatario_id !== null) {
      throw new BadRequestException('Este contrato já possui um inquilino');
    }

    // procura o usuario que esta aceitando o convite
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });

    // verifica se o usuario existe
    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    // verifica se o contrato possui um cpf indicado
    if (!contrato.cpf_locatario) {
      throw new BadRequestException(
        'Este contrato não possui um inquilino indicado',
      );
    }

    // verifica se o cpf é o mesmo indicado pelo proprietario
    if (usuario.cpf !== contrato.cpf_locatario) {
      throw new ForbiddenException(
        'Este convite não foi destinado a você',
      );
    }

    // associa o usuario logado ao contrato
    contrato.locatario_id = usuarioId;

    // avanca o andamento para revisao do proprietario
    contrato.status = 'AGUARDANDO_REVISAO';

    // invalida o convite depois do uso
    contrato.convite_token = null;

    // salva as alteracoes
    await this.contratoRepository.save(contrato);
    return {
      mensagem: 'Convite aceito com sucesso',
      contrato_id: contrato.id,
      status: contrato.status,
    };
  }


}