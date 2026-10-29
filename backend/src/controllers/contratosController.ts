
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
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
import { Res } from '@nestjs/common';
import { Response } from 'express';
import PDFDocument from 'pdfkit';
import { gerarConteudoContrato } from '../services/contratoPdf.service';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { join, extname } from 'path';
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
  indice_reajuste,
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

    // verifica se o indice de reajuste é valido
const indicesPermitidos = ['IPCA', 'IGP-M', 'INCC'];

if (!indicesPermitidos.includes(indice_reajuste)) {
  throw new BadRequestException('Índice de reajuste inválido');
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
        indice_reajuste: indice_reajuste,
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

// consulta os dados de um convite
@Get('convite/:token')
@UseGuards(AuthGuard)
async consultarConvite(
  @Param('token') token: string,
  @Req() request: Request,
) {
  const usuarioId = String((request as any).user.sub);

  // procura o contrato pelo token
 const contrato = await this.contratoRepository.findOne({
  where: { convite_token: token },
  relations: { imovel: true },
});

  if (!contrato) {
    throw new NotFoundException('Convite não encontrado');
  }

  // verifica se o convite ainda esta disponivel
  if (contrato.status !== 'AGUARDANDO_INQUILINO') {
    throw new BadRequestException('Este convite não está disponível');
  }

  // procura o usuario logado
  const usuario = await this.usuarioRepository.findOne({
    where: { id: usuarioId },
  });

  if (!usuario) {
    throw new NotFoundException('Usuário não encontrado');
  }

  // verifica se o convite pertence ao inquilino
  if (usuario.cpf !== contrato.cpf_locatario) {
    throw new ForbiddenException('Este convite não foi destinado a você');
  }

  // retorna apenas os dados necessarios
  return {
    id: contrato.id,
    status: contrato.status,
    valor_aluguel: contrato.valor_aluguel,
    indice_reajuste: contrato.indice_reajuste,
    despesas_inclusas: contrato.despesas_inclusas,
    garantia: contrato.garantia,
    tipo_caucao: contrato.tipo_caucao,
    valor_caucao: contrato.valor_caucao,
    data_inicio: contrato.data_inicio,
    data_fim: contrato.data_fim,
    dia_vencimento: contrato.dia_vencimento,
    imovel: {
      logradouro: contrato.imovel.logradouro,
      numero: contrato.imovel.numero,
      bairro: contrato.imovel.bairro,
      cidade: contrato.imovel.cidade,
      estado: contrato.imovel.estado,
    },
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

   // aguarda os dados adicionais do contrato
contrato.status = 'PENDENTE_DADOS';

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

  
  // inquilino cadastra os dados do fiador
  @Post(':id/fiador')
  @UseGuards(AuthGuard)
  async cadastrarFiador(
    @Param('id') id: string,
    @Body() dados: any,
    @Req() request: Request,
  ) {
    const usuarioId = String((request as any).user.sub);

    // procura o contrato
    const contrato = await this.contratoRepository.findOne({
      where: { id },
    });

    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado');
    }

    // verifica se o usuario é o inquilino
    if (String(contrato.locatario_id) !== usuarioId) {
      throw new ForbiddenException('Apenas o inquilino pode informar o fiador');
    }

    // verifica se o contrato esta na etapa correta
    if (contrato.status !== 'PENDENTE_DADOS') {
      throw new BadRequestException('Este contrato não permite alterações');
    }

    // verifica a garantia escolhida
    if (contrato.garantia !== 'fiador') {
      throw new BadRequestException('Este contrato não utiliza fiador');
    }

    const nome = String(dados?.fiador_nome ?? '').trim();
    const cpf = String(dados?.fiador_cpf ?? '').replace(/\D/g, '');
    const qualificacao = String(dados?.fiador_qualificacao ?? '').trim();
    const imovel = String(dados?.fiador_imovel ?? '').trim();

    // verifica os campos obrigatorios
    if (!nome || !/^\d{11}$/.test(cpf) || !qualificacao || !imovel) {
      throw new BadRequestException('Preencha todos os dados do fiador');
    }

    if (nome.length > 150) {
      throw new BadRequestException('Nome do fiador muito longo');
    }

    if (cpf === contrato.cpf_locatario) {
      throw new BadRequestException('O inquilino não pode ser o próprio fiador');
    }

    const proprietario = await this.usuarioRepository.findOne({
      where: { id: String(contrato.locador_id) },
    });

    if (cpf === proprietario?.cpf) {
      throw new BadRequestException('O proprietário não pode ser o fiador');
    }

    // salva os dados no contrato
    contrato.fiador_nome = nome;
    contrato.fiador_cpf = cpf;
    contrato.fiador_qualificacao = qualificacao;
    contrato.fiador_imovel = imovel;

    await this.contratoRepository.save(contrato);

    return {
      mensagem: 'Dados do fiador salvos com sucesso',
      contrato_id: contrato.id,
    };
  }

  
  // proprietario cadastra os dados do seguro fianca
  @Post(':id/seguro')
  @UseGuards(AuthGuard)
  async cadastrarSeguro(
    @Param('id') id: string,
    @Body() dados: any,
    @Req() request: Request,
  ) {
    const usuarioId = String((request as any).user.sub);

    // procura o contrato
    const contrato = await this.contratoRepository.findOne({
      where: { id },
    });

    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado');
    }

    // verifica se o usuario é o proprietario
    if (String(contrato.locador_id) !== usuarioId) {
      throw new ForbiddenException(
        'Apenas o proprietário pode informar o seguro',
      );
    }

    // verifica se o contrato esta na etapa correta
    if (contrato.status !== 'PENDENTE_DADOS') {
      throw new BadRequestException('Este contrato não permite alterações');
    }

    // verifica a garantia escolhida
    if (contrato.garantia !== 'seguro') {
      throw new BadRequestException('Este contrato não utiliza seguro-fiança');
    }

    const seguradora = String(dados?.seguro_seguradora ?? '').trim();
    const apolice = String(dados?.seguro_apolice ?? '').trim();

    // verifica os campos obrigatorios
    if (!seguradora || !apolice) {
      throw new BadRequestException('Preencha os dados do seguro-fiança');
    }

    if (seguradora.length > 150 || apolice.length > 100) {
      throw new BadRequestException('Dados do seguro muito longos');
    }

    // salva os dados do seguro
    contrato.seguro_seguradora = seguradora;
    contrato.seguro_apolice = apolice;

    await this.contratoRepository.save(contrato);

    return {
      mensagem: 'Dados do seguro-fiança salvos com sucesso',
      contrato_id: contrato.id,
    };
  }


  // verifica se os dados do contrato estao completos
  @Post(':id/concluir-dados')
  @UseGuards(AuthGuard)
  async concluirDados(
    @Param('id') id: string,
    @Req() request: Request,
  ) {
    const usuarioId = String((request as any).user.sub);

    // procura o contrato
    const contrato = await this.contratoRepository.findOne({
      where: { id },
    });

    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado');
    }

    // apenas o inquilino pode concluir sua etapa
    if (String(contrato.locatario_id) !== usuarioId) {
      throw new ForbiddenException(
        'Apenas o inquilino pode concluir esta etapa',
      );
    }

    if (contrato.status !== 'PENDENTE_DADOS') {
      throw new BadRequestException(
        'Este contrato não está aguardando dados',
      );
    }

    // verifica os dados conforme a garantia
    if (contrato.garantia === 'fiador') {
      if (
        !contrato.fiador_nome ||
        !contrato.fiador_cpf ||
        !contrato.fiador_qualificacao ||
        !contrato.fiador_imovel
      ) {
        throw new BadRequestException(
          'Preencha todos os dados do fiador',
        );
      }
    } else if (contrato.garantia === 'seguro') {
      if (!contrato.seguro_seguradora || !contrato.seguro_apolice) {
        throw new BadRequestException(
          'O proprietário ainda precisa informar o seguro-fiança',
        );
      }
    } else if (contrato.garantia === 'caucao') {
      if (!contrato.valor_caucao) {
        throw new BadRequestException(
          'O contrato não possui o valor da caução',
        );
      }
    } else if (contrato.garantia !== 'nenhuma') {
      throw new BadRequestException('Garantia inválida');
    }

    // libera o contrato para revisao
    contrato.status = 'AGUARDANDO_REVISAO';

    await this.contratoRepository.save(contrato);

    return {
      mensagem: 'Dados concluídos com sucesso',
      contrato_id: contrato.id,
      status: contrato.status,
    };
  }

  
  // consulta os dados do contrato para completar o cadastro
  @Get(':id/dados')
  @UseGuards(AuthGuard)
  async consultarDadosContrato(
    @Param('id') id: string,
    @Req() request: Request,
  ) {
    const usuarioId = String((request as any).user.sub);

  // busca o contrato com os dados dos usuarios e do imovel
const contrato = await this.contratoRepository.findOne({
  where: { id },
  relations: {
    locador: true,
    locatario: true,
    imovel: true,
  },
});

    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado');
    }

    // apenas as pessoas do contrato podem consultar
    if (
      String(contrato.locador_id) !== usuarioId &&
      String(contrato.locatario_id) !== usuarioId
    ) {
      throw new ForbiddenException(
        'Você não pode consultar este contrato',
      );
    }

   
return {
  id: contrato.id,
  status: contrato.status,

  // dados do proprietario
  locador: {
    nome: contrato.locador.nome,
    cpf: contrato.locador.cpf,
    rg: contrato.locador.rg,
    nacionalidade: contrato.locador.nacionalidade,
    estado_civil: contrato.locador.estado_civil,
    profissao: contrato.locador.profissao,
  },

  // dados do inquilino
  locatario: contrato.locatario
    ? {
        nome: contrato.locatario.nome,
        cpf: contrato.locatario.cpf,
        rg: contrato.locatario.rg,
        nacionalidade: contrato.locatario.nacionalidade,
        estado_civil: contrato.locatario.estado_civil,
        profissao: contrato.locatario.profissao,
      }
    : null,

  // dados do imovel
  imovel: {
    cep: contrato.imovel.cep,
    logradouro: contrato.imovel.logradouro,
    numero: contrato.imovel.numero,
    complemento: contrato.imovel.complemento,
    bairro: contrato.imovel.bairro,
    cidade: contrato.imovel.cidade,
    estado: contrato.imovel.estado,
  },

  // dados da locacao
  valor_aluguel: contrato.valor_aluguel,
  data_inicio: contrato.data_inicio,
  data_fim: contrato.data_fim,
  dia_vencimento: contrato.dia_vencimento,
  despesas_inclusas: contrato.despesas_inclusas,

  // dados da garantia
  garantia: contrato.garantia,
  tipo_caucao: contrato.tipo_caucao,
  valor_caucao: contrato.valor_caucao,

  fiador_nome: contrato.fiador_nome,
  fiador_cpf: contrato.fiador_cpf,
  fiador_qualificacao: contrato.fiador_qualificacao,
  fiador_imovel: contrato.fiador_imovel,

  seguro_seguradora: contrato.seguro_seguradora,
  seguro_apolice: contrato.seguro_apolice,
};

  }

  // lista os contratos do proprietario logado
  @Get('meus-contratos')
  @UseGuards(AuthGuard)
  async listarMeusContratos(@Req() request: Request) {
    const usuarioId = String((request as any).user.sub);

    const contratos = await this.contratoRepository.find({
      where: { locador_id: usuarioId },
      relations: { imovel: true },
      order: { id: 'DESC' },
    });

    return contratos.map((contrato) => ({
      id: contrato.id,
      status: contrato.status,
      garantia: contrato.garantia,
      valor_aluguel: contrato.valor_aluguel,
      data_inicio: contrato.data_inicio,
      data_fim: contrato.data_fim,
      imovel: {
        logradouro: contrato.imovel.logradouro,
        numero: contrato.imovel.numero,
        bairro: contrato.imovel.bairro,
        cidade: contrato.imovel.cidade,
        estado: contrato.imovel.estado,
      },
    }));
  }

  
  // proprietario aprova os dados do contrato
  @Post(':id/aprovar')
  @UseGuards(AuthGuard)
  async aprovarContrato(
    @Param('id') id: string,
    @Req() request: Request,
  ) {
    const usuarioId = String((request as any).user.sub);

    const contrato = await this.contratoRepository.findOne({
      where: { id },
    });

    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado');
    }

    // apenas o proprietario pode aprovar
    if (String(contrato.locador_id) !== usuarioId) {
      throw new ForbiddenException(
        'Apenas o proprietário pode aprovar o contrato',
      );
    }

    // so pode aprovar depois que o inquilino terminar
    if (contrato.status !== 'AGUARDANDO_REVISAO') {
      throw new BadRequestException(
        'O contrato ainda não está pronto para aprovação',
      );
    }

    contrato.status = 'AGUARDANDO_ASSINATURAS';

    await this.contratoRepository.save(contrato);

    return {
      mensagem: 'Contrato aprovado com sucesso',
      contrato_id: contrato.id,
      status: contrato.status,
    };
  }

// gera o pdf do contrato
@Get(':id/pdf')
@UseGuards(AuthGuard)
async gerarPdf(
  @Param('id') id: string,
  @Req() request: Request,
  @Res() response: Response,
) {
  const usuarioId = String((request as any).user.sub);

  // busca o contrato com os dados das pessoas e do imovel
  const contrato = await this.contratoRepository.findOne({
    where: { id },
    relations: {
      locador: true,
      locatario: true,
      imovel: true,
    },
  });

  if (!contrato) {
    throw new NotFoundException('Contrato não encontrado');
  }

  // somente o proprietario e o inquilino podem acessar
  if (
    String(contrato.locador_id) !== usuarioId &&
    String(contrato.locatario_id) !== usuarioId
  ) {
    throw new ForbiddenException('Você não pode acessar este contrato');
  }

  // impede gerar um contrato que ainda nao foi aprovado
  if (
    contrato.status !== 'AGUARDANDO_ASSINATURAS' &&
    contrato.status !== 'CONCLUIDO'
  ) {
    throw new BadRequestException('Este contrato ainda não foi aprovado');
  }

  // verifica se existem os dados necessarios
  if (!contrato.locador || !contrato.locatario || !contrato.imovel) {
    throw new BadRequestException('Faltam dados para gerar o contrato');
  }


  // configura a resposta para baixar o pdf
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader(
    'Content-Disposition',
    `attachment; filename="contrato-${id}.pdf"`,
  );

  // cria o documento pdf
  const pdf = new PDFDocument({ size: 'A4', margin: 50 });

  // envia o pdf para o navegador
  pdf.pipe(response);

  // coloca as informacoes do contrato
  gerarConteudoContrato(pdf, contrato);

  // finaliza o arquivo
  pdf.end();

}
}