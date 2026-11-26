
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  UploadedFile,
  Patch
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { basename, join, extname } from 'path';
import { existsSync, mkdirSync, unlinkSync, readFileSync } from 'fs';
//controller recebe requisisções http e encaminha
const { diskStorage } = require('multer');

import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { Contrato } from '../database/entities/contrato.entity';
import { Imovel } from '../database/entities/imovel.entity';
import { AuthGuard } from '../auth/auth.guard';
import { randomBytes } from 'crypto'; // gera codigo aleatorio para convite
import { Usuario } from '../database/entities/usuario.entity';
import { Perfil } from '../database/entities/perfil.entity';
import PDFDocument from 'pdfkit';
import { gerarConteudoContrato } from '../services/contratoPdf.service';
import { AsaasCobrancaService } from '../services/asaas-cobranca.service';
import { AsaasRepasseService } from '../services/asaas-repasse.service';

@Controller('contratos') //recebe solicitaçoes de cadastro de um contrato
export class ContratosController {
  constructor(
    @InjectRepository(Contrato)
    private readonly contratoRepository: Repository<Contrato>,

    @InjectRepository(Imovel)
    private readonly imovelRepository: Repository<Imovel>,

    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>, //consultar usuarios no postgree

    private readonly asaasCobrancaService: AsaasCobrancaService,
    private readonly asaasRepasseService: AsaasRepasseService,
  ) { }

  @Get('historico-pagamentos')
  @UseGuards(AuthGuard)
  listarHistoricoPagamentos(@Req() request: Request) {
    return this.asaasCobrancaService.listarHistoricoDoProprietario(
      String((request as any).user.sub),
    );
  }

  @Post('historico-pagamentos/:faturaId/tentar-repasse')
  @UseGuards(AuthGuard)
  tentarRepasse(@Param('faturaId') faturaId: string, @Req() request: Request) {
    if (!/^[1-9]\d{0,18}$/.test(faturaId) || BigInt(faturaId) > 9223372036854775807n) {
      throw new BadRequestException('Identificador de fatura inválido.');
    }

    return this.asaasRepasseService.reagendarRepasse(
      faturaId,
      String((request as any).user.sub),
    );
  }

  // Lista as parcelas do contrato para o histórico financeiro do inquilino.
  @Get(':id/faturas')
  @UseGuards(AuthGuard)
  async listarFaturas(
    @Param('id') contratoId: string,
    @Req() request: Request,
  ) {
    const usuarioId = String((request as any).user.sub);
    return this.asaasCobrancaService.listarFaturasDoContrato(
      contratoId,
      usuarioId,
    );
  }

  // Gera a assinatura mensal ou consulta a cobrança já criada para este contrato.
  @Post(':id/cobranca')
  @UseGuards(AuthGuard)
  async gerarCobranca(
    @Param('id') contratoId: string,
    @Req() request: Request,
  ) {
    const usuarioId = String((request as any).user.sub);
    return this.asaasCobrancaService.gerarCobranca(contratoId, usuarioId);
  }

  // Carrega o QR Pix da parcela sem armazenar a imagem Base64 no banco.
  @Get(':id/faturas/:faturaId/pix')
  @UseGuards(AuthGuard)
  async buscarPixDaFatura(
    @Param('id') contratoId: string,
    @Param('faturaId') faturaId: string,
    @Req() request: Request,
  ) {
    const usuarioId = String((request as any).user.sub);
    return this.asaasCobrancaService.buscarPixDaFatura(
      contratoId,
      faturaId,
      usuarioId,
    );
  }

  @Get('meus')
  @UseGuards(AuthGuard)
  async listarMeus(@Req() request: Request) {
    const usuarioId = String((request as any).user.sub);

    const contratos = await this.contratoRepository.find({
      where: { locatario_id: usuarioId },
      relations: { imovel: { proprietario: true } },
      order: { id: 'DESC' },
    });

   return contratos.map((contrato) => ({
  ...contrato,
  imovel: contrato.imovel
    ? {
        id: contrato.imovel.id,
        tipo: contrato.imovel.tipo,
        status: contrato.imovel.status,
        cep: contrato.imovel.cep,
        logradouro: contrato.imovel.logradouro,
        numero: contrato.imovel.numero,
        complemento: contrato.imovel.complemento,
        bairro: contrato.imovel.bairro,
        cidade: contrato.imovel.cidade,
        estado: contrato.imovel.estado,
        proprietario: contrato.imovel.proprietario
          ? {
              nome: contrato.imovel.proprietario.nome,
              telefone: (contrato.imovel.proprietario as any).telefone || null,
              email: (contrato.imovel.proprietario as any).email || null,
            }
          : null,
      }
    : null,
}));
  }

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
      where: { id: dados.imovel_id, excluido_em: IsNull() },
    });

    // verifica se o imovel existe
    if (!imovel) {
      throw new NotFoundException('Imóvel não encontrado');
    }

    // verifica se o imovel pertence ao usuario
    if (String(imovel.proprietario_id) !== String(usuarioId)) {
      const contratoExistente = await this.contratoRepository.findOne({
        where: { imovel_id: imovel.id },
        order: { id: 'DESC' },
      });

      if (
        contratoExistente &&
        [
          'RASCUNHO',
          'AGUARDANDO_INQUILINO',
          'PENDENTE_DADOS',
          'AGUARDANDO_REVISAO',
          'AGUARDANDO_ASSINATURAS',
          'CONCLUIDO',
        ].includes(contratoExistente.status)
      ) {
        throw new BadRequestException(
          'Este imóvel já possui um contrato cadastrado ou em andamento.',
        );
      }
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
    const cpfLimpo = String(cpf_locatario || '').replace(/\D/g, '');
    if (cpfLimpo.length !== 11) {
      throw new BadRequestException('Informe um CPF válido com 11 dígitos');
    }

    // impede que o proprietário coloque o próprio CPF
    const locador = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });

    if (locador && locador.cpf === cpfLimpo) {
      throw new BadRequestException(
        'Você não pode informar o seu próprio CPF como inquilino.',
      );
    }

    // se o CPF já existir no banco, verifica se possui perfil INQUILINO
    const usuarioDestino = await this.usuarioRepository.findOne({
      where: { cpf: cpfLimpo },
    });

    if (usuarioDestino) {
      const perfisDestino: Array<{ nome: string }> =
        await this.usuarioRepository.query(
          `SELECT p.nome
           FROM perfis p
           INNER JOIN usuarios_perfis up ON up.perfil_id = p.id
           WHERE up.usuario_id = $1`,
          [usuarioDestino.id],
        );

      const nomesPerfis = perfisDestino.map((p) =>
        String(p.nome).toUpperCase(),
      );

      if (!nomesPerfis.includes('INQUILINO')) {
        throw new BadRequestException(
          'O CPF informado pertence a um proprietário e não pode ser cadastrado como inquilino.',
        );
      }
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
      cpf_locatario: cpfLimpo,
      despesas_inclusas: despesas_inclusas,
      garantia: garantia,
      tipo_caucao: tipoCaucaoFinal,
      valor_caucao: valorCaucaoFinal,
    });

    // salva o contrato no banco
    const contratoSalvo = await this.contratoRepository.manager.transaction(async (manager) => {
      const imovelDisponivel = await manager.findOne(Imovel, {
        where: { id: imovel.id, proprietario_id: String(usuarioId), excluido_em: IsNull() },
        lock: { mode: 'pessimistic_write' },
      });
      if (!imovelDisponivel) throw new NotFoundException('Imóvel não encontrado');

      return manager.save(Contrato, contrato);
    });

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

    return this.contratoRepository.manager.transaction(async (manager) => {
      // procura o contrato pelo id
      const contrato = await manager.findOne(Contrato, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
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
      await manager.save(Contrato, contrato);

      return {
        mensagem: 'Convite gerado com sucesso',
        convite_token: contrato.convite_token,
        status: contrato.status,
      };
    });
  }
  @Get('meus-convites')
  @UseGuards(AuthGuard)
  async listarMeusConvites(@Req() request: Request) {
    const usuarioId = String((request as any).user.sub);
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
      select: { cpf: true },
    });

    if (!usuario) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const contratos = await this.contratoRepository.find({
      where: [
        {
          cpf_locatario: usuario.cpf,
          status: 'AGUARDANDO_INQUILINO',
          locatario_id: IsNull(),
          convite_token: Not(IsNull()),
        },
        { locatario_id: usuarioId },
      ],
      relations: { imovel: true },
      order: { id: 'DESC' },
    });

    return contratos.map((contrato) => ({
      contrato_id: contrato.id,
      status: contrato.locatario_id === null ? 'PENDENTE' : 'ACEITO',
      convite_token: contrato.locatario_id === null ? contrato.convite_token : null,
      imovel: contrato.imovel
        ? {
            logradouro: contrato.imovel.logradouro,
            numero: contrato.imovel.numero,
            cidade: contrato.imovel.cidade,
          }
        : null,
    }));
  }

  private montarNotificacoesContratos(
    contratos: Contrato[],
    usuarioId: string,
  ) {
    const hojeStr = new Intl.DateTimeFormat('sv-SE', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());

    const calcularDiasParaFim = (dataFim?: string | null) => {
      if (!dataFim) return null;
      const alvo = String(dataFim).slice(0, 10);
      return Math.round((Date.parse(alvo) - Date.parse(hojeStr)) / 86400000);
    };

    return contratos
      .filter(
        (c) => c.status !== 'RASCUNHO' && c.status !== 'AGUARDANDO_INQUILINO',
      )
      .map((contrato) => {
        const ehLocador = String(contrato.locador_id) === usuarioId;
        const diasParaFim = calcularDiasParaFim(contrato.data_fim);
        const pertoDoFim =
          contrato.status === 'CONCLUIDO' &&
          diasParaFim !== null &&
          diasParaFim <= 60;

        let tipo = 'STATUS';
        let titulo = 'Atualização do contrato';
        let descricao = '';

        if (pertoDoFim) {
          tipo = diasParaFim! < 0 ? 'ENCERRADO' : 'PERTO_DO_FIM';
          titulo =
            diasParaFim! < 0
              ? 'Prazo do contrato encerrado'
              : diasParaFim === 0
                ? 'Contrato encerra hoje'
                : `Contrato encerra em ${diasParaFim} ${diasParaFim === 1 ? 'dia' : 'dias'}`;
          descricao =
            diasParaFim! < 0
              ? 'A vigência inicial chegou ao fim. Informe se há interesse em renovar.'
              : 'O término da vigência está próximo. Deseja renovar este contrato?';
        } else {
          switch (contrato.status) {
            case 'PENDENTE_DADOS':
              titulo = ehLocador
                ? 'Aguardando preenchimento pelo inquilino'
                : 'Complete seus dados e documentos';
              descricao = ehLocador
                ? 'O inquilino aceitou o convite e está preenchendo a ficha cadastral.'
                : 'Envie sua ficha cadastral, documentos e dados da garantia para análise.';
              break;
            case 'AGUARDANDO_REVISAO':
              titulo = ehLocador
                ? 'Ficha cadastral pronta para revisão'
                : 'Cadastro em análise pelo proprietário';
              descricao = ehLocador
                ? 'O inquilino concluiu o envio. Revise os documentos e aprove ou recuse.'
                : 'Seus dados foram enviados e aguardam validação do proprietário.';
              break;
            case 'AGUARDANDO_ASSINATURAS':
              titulo = 'Contrato liberado para assinatura';
              descricao = ehLocador
                ? 'Análise aprovada. Faça o download do PDF e envie o contrato assinado.'
                : 'Seu cadastro foi aprovado! O contrato está na etapa de assinatura.';
              break;
            case 'CADASTRO_RECUSADO':
              tipo = 'RECUSADO';
              titulo = 'Análise cadastral recusada';
              descricao =
                contrato.justificativa_analise ||
                'O cadastro não foi aprovado na etapa de revisão.';
              break;
            case 'CANCELADO':
              tipo = 'CANCELADO';
              titulo = 'Contrato cancelado';
              descricao = 'Este processo de locação foi cancelado.';
              break;
            case 'CONCLUIDO':
            default:
              titulo = 'Contrato ativo';
              descricao = 'Contrato assinado e vigente.';
              break;
          }
        }

        return {
          contrato_id: contrato.id,
          papel: ehLocador ? 'PROPRIETARIO' : 'INQUILINO',
          status: contrato.status,
          tipo,
          titulo,
          descricao,
          data_inicio: contrato.data_inicio,
          data_fim: contrato.data_fim,
          dias_para_fim: diasParaFim,
          perto_do_fim: pertoDoFim,
          interesse_renovacao: contrato.interesse_renovacao || null,
          pode_responder_renovacao: !ehLocador && pertoDoFim,
          imovel: contrato.imovel
            ? {
                id: contrato.imovel.id,
                logradouro: contrato.imovel.logradouro,
                numero: contrato.imovel.numero,
                cidade: contrato.imovel.cidade,
              }
            : null,
        };
      });
  }

  @Get('minhas-notificacoes')
  @UseGuards(AuthGuard)
  async listarMinhasNotificacoes(@Req() request: Request) {
    const usuarioId = String((request as any).user.sub);

    const [convitesInquilino, contratosUsuario, boletos] = await Promise.all([
      this.listarMeusConvites(request),
      this.contratoRepository.find({
        where: [{ locatario_id: usuarioId }, { locador_id: usuarioId }],
        relations: { imovel: true, locatario: true },
        order: { id: 'DESC' },
      }),
      this.asaasCobrancaService
        .listarBoletosDoInquilino(usuarioId)
        .catch(() => []),
    ]);

    const convitesProprietario = contratosUsuario
      .filter(
        (c) => String(c.locador_id) === usuarioId && c.status !== 'RASCUNHO',
      )
      .map((c) => ({
        contrato_id: c.id,
        papel: 'PROPRIETARIO',
        status:
          c.status === 'CANCELADO'
            ? 'CANCELADO'
            : c.locatario_id !== null
              ? 'RESPONDIDO'
              : 'AGUARDANDO_RESPOSTA',
        convite_token: null,
        inquilino_nome: c.locatario?.nome || null,
        imovel: c.imovel
          ? {
              id: c.imovel.id,
              logradouro: c.imovel.logradouro,
              numero: c.imovel.numero,
              cidade: c.imovel.cidade,
            }
          : null,
      }));

    const contratos = this.montarNotificacoesContratos(
      contratosUsuario,
      usuarioId,
    );

    return {
      convites: [...convitesInquilino, ...convitesProprietario],
      contratos,
      boletos,
    };
  }

  @Patch(':id/renovacao')
  @UseGuards(AuthGuard)
  async responderRenovacao(
    @Param('id') id: string,
    @Body() body: { deseja_renovar?: boolean },
    @Req() request: Request,
  ) {
    const usuarioId = String((request as any).user.sub);

    if (typeof body?.deseja_renovar !== 'boolean') {
      throw new BadRequestException('Informe se deseja renovar o contrato.');
    }

    const contrato = await this.contratoRepository.findOne({ where: { id } });

    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (
      String(contrato.locatario_id) !== usuarioId &&
      String(contrato.locador_id) !== usuarioId
    ) {
      throw new ForbiddenException('Você não tem permissão neste contrato');
    }

    contrato.interesse_renovacao = body.deseja_renovar ? 'SIM' : 'NAO';
    await this.contratoRepository.save(contrato);

    return {
      mensagem: body.deseja_renovar
        ? 'Interesse em renovação registrado com sucesso.'
        : 'Opção por não renovar registrada.',
      interesse_renovacao: contrato.interesse_renovacao,
    };
  }


  
//consultar o proximo passo
  @Get('convite/:token/destino')
  async consultarDestinoConvite(@Param('token') token: string) {
    const contrato = await this.contratoRepository.findOne({
      where: {
        convite_token: token,
        status: 'AGUARDANDO_INQUILINO',
      },
    });

    if (!contrato?.cpf_locatario) {
      throw new NotFoundException('Convite indisponível.');
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { cpf: contrato.cpf_locatario },
    });

    return {
      possui_conta: Boolean(usuario),
      cpf_locatario: contrato.cpf_locatario,
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

    return this.contratoRepository.manager.transaction(async (manager) => {
      const contrato = await manager.findOne(Contrato, {
        where: { convite_token: token },
        lock: { mode: 'pessimistic_write' },
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

  
    const usuario = await manager.findOne(Usuario, { where: { id: usuarioId } });

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
   

      const perfilInquilino = await manager.findOne(Perfil, {
        where: { nome: 'INQUILINO' },
      });

      if (!perfilInquilino) {
        throw new InternalServerErrorException(
          'O perfil INQUILINO não está configurado.',
        );
      }

      const vinculosInseridos = await manager.query(
        `INSERT INTO usuarios_perfis (usuario_id, perfil_id)
        VALUES ($1, $2)
        ON CONFLICT (usuario_id, perfil_id) DO NOTHING
        RETURNING usuario_id`,
        [usuarioId, perfilInquilino.id],
      );

      contrato.locatario_id = usuarioId;
      contrato.status = 'PENDENTE_DADOS';
      contrato.convite_token = null;

      await manager.save(Contrato, contrato);

      return {
        mensagem: 'Convite aceito com sucesso',
        contrato_id: contrato.id,
        status: contrato.status,
        perfil_adicionado: vinculosInseridos.length > 0,
      };
    });
  }

  @Post(':id/cancelar')
  @UseGuards(AuthGuard)
  async cancelarContrato(@Param('id') id: string, @Req() request: Request) {
    const usuarioId = String((request as any).user.sub);
    const contrato = await this.contratoRepository.findOne({ where: { id } });

    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (String(contrato.locador_id) !== usuarioId) {
      throw new ForbiddenException('Apenas o proprietário pode cancelar o contrato');
    }

    const resultado = await this.contratoRepository.update(
      { id, locador_id: usuarioId, status: In(['AGUARDANDO_INQUILINO', 'PENDENTE_DADOS']) },
      { status: 'CANCELADO', convite_token: null },
    );

    if (!resultado.affected) {
      throw new BadRequestException('O contrato só pode ser cancelado enquanto aguarda o aceite ou os dados do inquilino.');
    }

    return { status: 'CANCELADO', mensagem: 'Contrato cancelado com sucesso.' };
  }

  private async atualizarContratoPendente(id: string, dados: Partial<Contrato>) {
    const resultado = await this.contratoRepository.update(
      { id, status: 'PENDENTE_DADOS' },
      dados,
    );

    if (!resultado.affected) {
      throw new BadRequestException('O contrato não está mais aguardando os dados do inquilino.');
    }
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

    await this.atualizarContratoPendente(id, {
      fiador_nome: contrato.fiador_nome,
      fiador_cpf: contrato.fiador_cpf,
      fiador_qualificacao: contrato.fiador_qualificacao,
      fiador_imovel: contrato.fiador_imovel,
    });

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

    await this.atualizarContratoPendente(id, {
      seguro_seguradora: contrato.seguro_seguradora,
      seguro_apolice: contrato.seguro_apolice,
    });

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

    if (
      !contrato.renda_mensal_locatario ||
      !contrato.ocupacao_locatario ||
      !Array.isArray(contrato.documentos_locatario) ||
      contrato.documentos_locatario.length < 3
    ) {
      throw new BadRequestException(
        'Preencha a ficha cadastral e anexe todos os 3 documentos obrigatórios antes de concluir',
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

    await this.atualizarContratoPendente(id, {
      status: contrato.status,
    });

    return {
      mensagem: 'Dados concluídos com sucesso',
      contrato_id: contrato.id,
      status: contrato.status,
    };
  }

  // Busca o contrato do imóvel selecionado pelo proprietário
  @Get('imovel/:imovelId/historico')
  @UseGuards(AuthGuard)
  async listarHistoricoDoImovel(
    @Param('imovelId') imovelId: string,
    @Req() request: Request,
  ) {
    const usuarioId = String((request as any).user.sub);
    const imovel = await this.imovelRepository.findOne({ where: { id: imovelId } });

    if (!imovel) {
      throw new NotFoundException('Imóvel não encontrado');
    }

    if (String(imovel.proprietario_id) !== usuarioId) {
      throw new ForbiddenException('Este imóvel não pertence a você');
    }

    const contratos = await this.contratoRepository.find({
      where: { imovel_id: imovelId, locador_id: usuarioId },
      relations: { locatario: true },
      order: { id: 'DESC' },
    });

    return contratos.map((contrato) => ({
      id: contrato.id,
      status: contrato.status,
      data_inicio: contrato.data_inicio,
      data_fim: contrato.data_fim,
      valor_aluguel: contrato.valor_aluguel,
      cpf_convidado: contrato.cpf_locatario,
      inquilino: contrato.locatario ? {
        nome: contrato.locatario.nome,
        cpf: contrato.locatario.cpf,
        telefone: contrato.locatario.telefone,
      } : null,
    }));
  }

  @Get('imovel/:imovelId')
  @UseGuards(AuthGuard)
  async buscarPorImovel(
    @Param('imovelId') imovelId: string,
    @Req() request: Request,
  ) {
    const usuarioId = String((request as any).user.sub);

    const imovel = await this.imovelRepository.findOne({
      where: { id: imovelId },
    });

    if (!imovel) {
      throw new NotFoundException('Imóvel não encontrado');
    }

    if (String(imovel.proprietario_id) !== usuarioId) {
      throw new ForbiddenException('Este imóvel não pertence a você');
    }

    const contrato = await this.contratoRepository.findOne({
      where: { imovel_id: imovelId, locador_id: usuarioId },
      relations: {
        locador: true,
        locatario: true,
        imovel: true,
      },
      order: { id: 'DESC' },
    });

    if (!contrato) {
      throw new NotFoundException('Nenhum contrato encontrado para este imóvel');
    }

    return {
      id: contrato.id,
      status: contrato.status,
      convite_token: contrato.convite_token,
      cpf_locatario: contrato.cpf_locatario,
      indice_reajuste: contrato.indice_reajuste,
      renda_mensal_locatario: contrato.renda_mensal_locatario,
      ocupacao_locatario: contrato.ocupacao_locatario,
      documentos_locatario: contrato.documentos_locatario || [],
      status_analise_cadastral: contrato.status_analise_cadastral,
      justificativa_analise: contrato.justificativa_analise,
      data_analise_cadastral: contrato.data_analise_cadastral,
      arquivo_contrato_assinado: contrato.arquivo_contrato_assinado || null,
      data_assinatura_final: contrato.data_assinatura_final || null,

      locador: contrato.locador
        ? {
          nome: contrato.locador.nome,
          cpf: contrato.locador.cpf,
          rg: contrato.locador.rg,
          nacionalidade: contrato.locador.nacionalidade,
          estado_civil: contrato.locador.estado_civil,
          profissao: contrato.locador.profissao,
        }
        : null,
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
      imovel: contrato.imovel
        ? {
          id: contrato.imovel.id,
          cep: contrato.imovel.cep,
          logradouro: contrato.imovel.logradouro,
          numero: contrato.imovel.numero,
          complemento: contrato.imovel.complemento,
          bairro: contrato.imovel.bairro,
          cidade: contrato.imovel.cidade,
          estado: contrato.imovel.estado,
          tipo: contrato.imovel.tipo,
        }
        : null,
      valor_aluguel: contrato.valor_aluguel,
      data_inicio: contrato.data_inicio,
      data_fim: contrato.data_fim,
      dia_vencimento: contrato.dia_vencimento,
      despesas_inclusas: contrato.despesas_inclusas,
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
      convite_token: contrato.convite_token,
      cpf_locatario: contrato.cpf_locatario,
      indice_reajuste: contrato.indice_reajuste,
      renda_mensal_locatario: contrato.renda_mensal_locatario,
      ocupacao_locatario: contrato.ocupacao_locatario,
      documentos_locatario: contrato.documentos_locatario || [],
      status_analise_cadastral: contrato.status_analise_cadastral,
      justificativa_analise: contrato.justificativa_analise,
      data_analise_cadastral: contrato.data_analise_cadastral,
      arquivo_contrato_assinado: contrato.arquivo_contrato_assinado || null,
      data_assinatura_final: contrato.data_assinatura_final || null,

      // dados do proprietario
      locador: contrato.locador
        ? {
          nome: contrato.locador.nome,
          cpf: contrato.locador.cpf,
          rg: contrato.locador.rg,
          data_nascimento:
            (contrato.locador as any).data_nascimento || null,
          nacionalidade: contrato.locador.nacionalidade,
          estado_civil: contrato.locador.estado_civil,
          profissao: contrato.locador.profissao,
          email: (contrato.locador as any).email || null,
          telefone: (contrato.locador as any).telefone || null,
        }
        : null,
      locatario: contrato.locatario
        ? {
          nome: contrato.locatario.nome,
          cpf: contrato.locatario.cpf,
          rg: contrato.locatario.rg,
          data_nascimento:
            (contrato.locatario as any).data_nascimento || null,
          nacionalidade: contrato.locatario.nacionalidade,
          estado_civil: contrato.locatario.estado_civil,
          profissao: contrato.locatario.profissao,
          email: (contrato.locatario as any).email || null,
          telefone: (contrato.locatario as any).telefone || null,
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
      imovel: contrato.imovel
        ? {
          logradouro: contrato.imovel.logradouro,
          numero: contrato.imovel.numero,
          bairro: contrato.imovel.bairro,
          cidade: contrato.imovel.cidade,
          estado: contrato.imovel.estado,
        }
        : null,
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

    // permite gerar a prévia na revisão e o PDF final após aprovação
    if (
      contrato.status !== 'AGUARDANDO_REVISAO' &&
      contrato.status !== 'AGUARDANDO_ASSINATURAS' &&
      contrato.status !== 'CONCLUIDO'
    ) {
      throw new BadRequestException('Este contrato ainda não está disponível para geração de PDF');
    }

    // verifica se existem os dados necessarios
    if (!contrato.locador || !contrato.locatario || !contrato.imovel) {
      throw new BadRequestException('Faltam dados para gerar o contrato');
    }

    // fixa a data da primeira emissão (prévia) para não mudar nos dias seguintes
    if (!contrato.data_emissao_pdf) {
      contrato.data_emissao_pdf = new Date();
      await this.contratoRepository.update(
        { id },
        { data_emissao_pdf: contrato.data_emissao_pdf },
      );
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
  // inquilino envia renda, ocupação e documentos comprobatórios
  @Post(':id/ficha-cadastral')
  @UseGuards(AuthGuard)
  @UseInterceptors(
    FilesInterceptor('documentos', 5, {
      storage: diskStorage({
        destination: './uploads/contratos',
        filename: (_req: any, file: any, cb: any) => {
          const unico = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          cb(null, `${unico}${extname(file.originalname).toLowerCase()}`);
        },
      }),
    }),
  )
  async enviarFichaCadastral(
    @Param('id') id: string,
    @Body() body: any,
    @UploadedFiles() arquivos: Array<any>,
    @Req() request: Request,
  ) {
    const usuarioId = String((request as any).user.sub);

    const contrato = await this.contratoRepository.findOne({
      where: { id },
    });

    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (String(contrato.locatario_id) !== usuarioId) {
      throw new ForbiddenException('Você não é o inquilino deste contrato');
    }

    if (contrato.status !== 'PENDENTE_DADOS') {
      throw new BadRequestException(
        'Este contrato não está aberto para envio de ficha cadastral',
      );
    }

    const rendaMensal = Number(body?.renda_mensal);
    const ocupacaoInformada = typeof body?.ocupacao === 'string' ? body.ocupacao.trim() : '';

    if (!Number.isFinite(rendaMensal) || rendaMensal <= 0) {
      throw new BadRequestException('Informe uma renda mensal válida');
    }

    let tiposDocumentos: string[] = [];
    if (body?.tipos_documentos) {
      try {
        tiposDocumentos = JSON.parse(body.tipos_documentos);
      } catch {
        tiposDocumentos = [];
      }
    }

    const novosDocumentos = (arquivos || []).map((arq, idx) => ({
      tipo: tiposDocumentos[idx] || 'Comprovante',
      nome_original: arq.originalname,
      arquivo: arq.filename,
      mimetype: arq.mimetype,
    }));

    return this.contratoRepository.manager.transaction(async (manager) => {
      const usuario = await manager.findOne(Usuario, {
        where: { id: usuarioId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!usuario) throw new NotFoundException('Usuário não encontrado.');

      const profissaoCadastrada = usuario.profissao?.trim();
      const ocupacao = profissaoCadastrada || ocupacaoInformada;
      if (!ocupacao || ocupacao.length > 150) {
        throw new BadRequestException('Informe uma ocupação de até 150 caracteres.');
      }

      const contratoAtual = await manager.findOne(Contrato, {
        where: { id, status: 'PENDENTE_DADOS', locatario_id: usuarioId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!contratoAtual) {
        throw new BadRequestException('O contrato não está mais aguardando os dados do inquilino.');
      }

      const listaFinalDocumentos = [...(contratoAtual.documentos_locatario ?? []), ...novosDocumentos];
      if (listaFinalDocumentos.length === 0) {
        throw new BadRequestException('Anexe pelo menos um documento comprobatório.');
      }

      await manager.update(
        Contrato,
        id,
        {
          renda_mensal_locatario: rendaMensal,
          ocupacao_locatario: ocupacao,
          documentos_locatario: listaFinalDocumentos,
          status_analise_cadastral: 'PENDENTE',
        },
      );
      if (!profissaoCadastrada) {
        await manager.update(Usuario, usuarioId, { profissao: ocupacao });
      }

      return {
        message: 'Ficha cadastral e documentos salvos com sucesso!',
        renda_mensal_locatario: rendaMensal,
        ocupacao_locatario: ocupacao,
        documentos_locatario: listaFinalDocumentos,
      };
    });
  }

  // 2. Visualizar/baixar documento anexado pelo inquilino (protegido por JWT)
  @Get(':id/documentos/:arquivo')
  @UseGuards(AuthGuard)
  async visualizarDocumento(
    @Param('id') id: string,
    @Param('arquivo') arquivo: string,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    const usuarioId = String((request as any).user.sub);

    const contrato = await this.contratoRepository.findOne({
      where: { id },
    });

    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado');
    }

    const ehLocador = String(contrato.locador_id) === usuarioId;
    const ehLocatario = String(contrato.locatario_id) === usuarioId;

    if (!ehLocador && !ehLocatario) {
      throw new ForbiddenException('Sem permissão para acessar este documento');
    }

    const nomeSeguro = basename(arquivo);
    const pastaUploads = join(process.cwd(), 'uploads', 'contratos');
    if (!existsSync(pastaUploads)) {
      mkdirSync(pastaUploads, { recursive: true });
    }

    const caminhoArquivo = join(pastaUploads, nomeSeguro);
    if (!existsSync(caminhoArquivo)) {
      throw new NotFoundException('Arquivo não encontrado no servidor');
    }

    const { mime, ext } = this.detectarMimeEExtensao(caminhoArquivo);
    const nomeComExtensao = nomeSeguro.includes('.')
      ? nomeSeguro
      : `${nomeSeguro}${ext}`;

    res.setHeader('Content-Type', mime);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${nomeComExtensao}"`,
    );
    return res.sendFile(caminhoArquivo);

  }

  // proprietário aprova ou recusa a análise cadastral com justificativa
  @Post(':id/analise-cadastral')
  @UseGuards(AuthGuard)
  async registrarAnaliseCadastral(
    @Param('id') id: string,
    @Body() body: { decisao?: string; justificativa?: string },
    @Req() request: Request,
  ) {
    const usuarioId = String((request as any).user.sub);

    const contrato = await this.contratoRepository.findOne({
      where: { id },
    });

    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (String(contrato.locador_id) !== usuarioId) {
      throw new ForbiddenException('Apenas o proprietário pode avaliar o cadastro');
    }

    if (contrato.status !== 'AGUARDANDO_REVISAO') {
      throw new BadRequestException(
        'Este contrato não está aguardando análise cadastral',
      );
    }

    const decisao = String(body?.decisao || '').toUpperCase();
    const justificativa = String(body?.justificativa || '').trim();

    if (decisao !== 'APROVADA' && decisao !== 'RECUSADA') {
      throw new BadRequestException('Decisão inválida. Informe APROVADA ou RECUSADA');
    }

    if (!justificativa) {
      throw new BadRequestException(
        'A justificativa da decisão é obrigatória',
      );
    }

    contrato.status_analise_cadastral = decisao;
    contrato.justificativa_analise = justificativa;
    contrato.data_analise_cadastral = new Date();
    contrato.status =
      decisao === 'APROVADA' ? 'AGUARDANDO_ASSINATURAS' : 'CADASTRO_RECUSADO';

    await this.contratoRepository.save(contrato);

    return {
      message:
        decisao === 'APROVADA'
          ? 'Cadastro aprovado e contrato liberado para assinatura!'
          : 'Cadastro recusado e justificativa registrada.',
      status: contrato.status,
      status_analise_cadastral: contrato.status_analise_cadastral,
      justificativa_analise: contrato.justificativa_analise,
      data_analise_cadastral: contrato.data_analise_cadastral,
    };
  }

  // proprietário envia o contrato único já assinado por ambas as partes
  @Post(':id/upload-assinatura')
  @UseGuards(AuthGuard)
  @UseInterceptors(
  FileInterceptor('arquivo', {
    storage: diskStorage({
      destination: './uploads/contratos',
      filename: (_req: any, file: any, cb: any) => {
        const unico = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${unico}${extname(file.originalname).toLowerCase()}`);
      },
    }),
  }),
)
  async uploadContratoAssinado(
    @Param('id') id: string,
    @UploadedFile() arquivo: any,
    @Req() request: Request,
  ) {
    const usuarioId = String((request as any).user.sub);

    const contrato = await this.contratoRepository.findOne({
      where: { id },
    });

    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (String(contrato.locador_id) !== usuarioId) {
      throw new ForbiddenException(
        'Apenas o proprietário pode enviar o contrato final assinado',
      );
    }

    if (
      contrato.status !== 'AGUARDANDO_ASSINATURAS' &&
      contrato.status !== 'CONCLUIDO'
    ) {
      throw new BadRequestException(
        'Aprove a análise cadastral antes de enviar o contrato assinado',
      );
    }

    if (!arquivo) {
      throw new BadRequestException(
        'Selecione o arquivo PDF ou imagem do contrato assinado',
      );
    }

    // remove o arquivo anterior se o proprietário estiver substituindo o PDF
    if (contrato.arquivo_contrato_assinado) {
      try {
        unlinkSync(
          join(
            process.cwd(),
            'uploads',
            'contratos',
            basename(contrato.arquivo_contrato_assinado),
          ),
        );
      } catch { }
    }

    contrato.arquivo_contrato_assinado = arquivo.filename;
    contrato.data_assinatura_final = new Date();
    contrato.status = 'CONCLUIDO';

    const imovel = await this.imovelRepository.findOne({
      where: { id: contrato.imovel_id },
    });

    if (imovel) {
      imovel.status = 'Alugado';
      await this.imovelRepository.save(imovel);
    }

    await this.contratoRepository.save(contrato);

    return {
      message:
        'Contrato assinado enviado com sucesso! Contrato concluído e imóvel marcado como Alugado.',
      status: contrato.status,
      arquivo_contrato_assinado: contrato.arquivo_contrato_assinado,
      data_assinatura_final: contrato.data_assinatura_final,
    };
  }

  //proprietário ou inquilino baixa/visualiza o contrato final assinado
  @Get(':id/contrato-assinado')
  @UseGuards(AuthGuard)
  async baixarContratoAssinado(
    @Param('id') id: string,
    @Req() request: Request,
    @Res() res: Response,
  ) {
    const usuarioId = String((request as any).user.sub);

    const contrato = await this.contratoRepository.findOne({
      where: { id },
    });

    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado');
    }

    const ehLocador = String(contrato.locador_id) === usuarioId;
    const ehLocatario = String(contrato.locatario_id) === usuarioId;

    if (!ehLocador && !ehLocatario) {
      throw new ForbiddenException('Sem permissão para acessar este contrato');
    }

    if (!contrato.arquivo_contrato_assinado) {
      throw new NotFoundException(
        'O contrato assinado ainda não foi enviado pelo proprietário',
      );
    }

    const nomeSeguro = basename(contrato.arquivo_contrato_assinado);
    const caminhoArquivo = join(
      process.cwd(),
      'uploads',
      'contratos',
      nomeSeguro,
    );

    if (!existsSync(caminhoArquivo)) {
      throw new NotFoundException('Arquivo não encontrado no servidor');
    }

    const { mime, ext } = this.detectarMimeEExtensao(caminhoArquivo);
    const nomeComExtensao = nomeSeguro.includes('.')
      ? nomeSeguro
      : `${nomeSeguro}${ext}`;

    res.setHeader('Content-Type', mime);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${nomeComExtensao}"`,
    );
    return res.sendFile(caminhoArquivo);
  }

  // edita os dados do contrato enquanto o inquilino ainda não aceitou o convite
// edita os dados do contrato enquanto o inquilino ainda não aceitou o convite
  @Patch(':id')
  @UseGuards(AuthGuard)
  async atualizarContratoPreAceite(
    @Param('id') id: string,
    @Body() body: any,
    @Req() request: Request,
  ) {
    const usuarioId = String((request as any).user.sub);

    return this.contratoRepository.manager.transaction(async (manager) => {
      const contrato = await manager.findOne(Contrato, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });

      if (!contrato) {
        throw new NotFoundException('Contrato não encontrado');
      }

      if (String(contrato.locador_id) !== usuarioId) {
        throw new ForbiddenException(
          'Apenas o proprietário pode editar o contrato',
        );
      }

      if (
        contrato.status !== 'RASCUNHO' &&
        contrato.status !== 'AGUARDANDO_INQUILINO'
      ) {
        throw new BadRequestException(
          'Não é possível editar o contrato após o inquilino aceitar o convite',
        );
      }

      if (body.cpf_locatario !== undefined) {
        const cpfLimpo = String(body.cpf_locatario).replace(/\D/g, '');
        if (cpfLimpo.length !== 11) {
          throw new BadRequestException('Informe um CPF válido com 11 dígitos');
        }

        const locador = await manager.findOne(Usuario, {
          where: { id: usuarioId },
        });

        if (locador && locador.cpf === cpfLimpo) {
          throw new BadRequestException(
            'Você não pode informar o seu próprio CPF como inquilino.',
          );
        }

        const usuarioDestino = await manager.findOne(Usuario, {
          where: { cpf: cpfLimpo },
        });

        if (usuarioDestino) {
          const perfisDestino: Array<{ nome: string }> = await manager.query(
            `SELECT p.nome
             FROM perfis p
             INNER JOIN usuarios_perfis up ON up.perfil_id = p.id
             WHERE up.usuario_id = $1`,
            [usuarioDestino.id],
          );

          const nomesPerfis = perfisDestino.map((p) =>
            String(p.nome).toUpperCase(),
          );

          if (!nomesPerfis.includes('INQUILINO')) {
            throw new BadRequestException(
              'O CPF informado pertence a um proprietário e não pode ser cadastrado como inquilino.',
            );
          }
        }

        contrato.cpf_locatario = cpfLimpo;
      }

      if (body.valor_aluguel !== undefined) {
        contrato.valor_aluguel = String(Number(body.valor_aluguel));
      }
      if (body.data_inicio !== undefined) {
        contrato.data_inicio = body.data_inicio;
      }
      if (body.data_fim !== undefined) {
        contrato.data_fim = body.data_fim;
      }
      if (body.dia_vencimento !== undefined) {
        contrato.dia_vencimento = Number(body.dia_vencimento);
      }
      if (body.indice_reajuste !== undefined) {
        contrato.indice_reajuste = body.indice_reajuste;
      }
      if (body.despesas_inclusas !== undefined) {
        contrato.despesas_inclusas = Array.isArray(body.despesas_inclusas)
          ? body.despesas_inclusas
          : [];
      }
      if (body.garantia !== undefined) {
        contrato.garantia = body.garantia;
        contrato.tipo_caucao =
          body.garantia === 'caucao' ? body.tipo_caucao || null : null;
        contrato.valor_caucao =
          body.garantia === 'caucao' && body.tipo_caucao === 'negociado'
            ? String(Number(body.valor_caucao))
            : null;
      }

      await manager.save(Contrato, contrato);

      return {
        message: 'Contrato atualizado com sucesso!',
        contrato,
      };
    });
  }

  // proprietário informa seguradora e apólice quando garantia === 'seguro'
  @Patch(':id/seguro')
  @UseGuards(AuthGuard)
  async salvarDadosSeguro(
    @Param('id') id: string,
    @Body() body: { seguro_seguradora?: string; seguro_apolice?: string },
    @Req() request: Request,
  ) {
    const usuarioId = String((request as any).user.sub);

    const contrato = await this.contratoRepository.findOne({
      where: { id },
    });

    if (!contrato) {
      throw new NotFoundException('Contrato não encontrado');
    }

    if (String(contrato.locador_id) !== usuarioId) {
      throw new ForbiddenException(
        'Apenas o proprietário pode informar os dados do seguro-fiança',
      );
    }

    if (contrato.garantia !== 'seguro') {
      throw new BadRequestException(
        'A garantia deste contrato não é seguro-fiança',
      );
    }

    const seguradora = String(body?.seguro_seguradora || '').trim();
    const apolice = String(body?.seguro_apolice || '').trim();

    if (!seguradora || !apolice) {
      throw new BadRequestException(
        'Informe o nome da seguradora e o número da apólice',
      );
    }

    contrato.seguro_seguradora = seguradora;
    contrato.seguro_apolice = apolice;

    const resultado = await this.contratoRepository.update(
      { id, status: Not('CANCELADO') },
      { seguro_seguradora: seguradora, seguro_apolice: apolice },
    );
    if (!resultado.affected) {
      throw new BadRequestException('Este contrato foi cancelado.');
    }

    return {
      message: 'Dados do seguro-fiança salvos com sucesso!',
      seguro_seguradora: contrato.seguro_seguradora,
      seguro_apolice: contrato.seguro_apolice,
    };
  }


  @Get('inquilino/meu-contrato')
  @UseGuards(AuthGuard)
  async buscarContratoDoInquilino(@Req() request: Request) {
    const usuarioId = String((request as any).user.sub);

    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });

    const condicoes: any[] = [{ locatario_id: usuarioId }];
    if (usuario?.cpf) {
      condicoes.push({ cpf_locatario: usuario.cpf });
    }

    const contrato = await this.contratoRepository.findOne({
      where: condicoes,
      relations: {
        imovel: true,
        locador: true,
      },
      order: { id: 'DESC' },
    });

    if (!contrato) {
      throw new NotFoundException('Nenhum contrato encontrado para este inquilino');
    }

    return contrato;
  }

  private detectarMimeEExtensao(caminhoArquivo: string): {
    mime: string;
    ext: string;
  } {
    const buffer = readFileSync(caminhoArquivo);

    // PDF (%PDF)
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      return { mime: 'application/pdf', ext: '.pdf' };
    }

    // PNG (\x89PNG)
    if (
      buffer.length >= 4 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      return { mime: 'image/png', ext: '.png' };
    }

    // JPEG (\xFF\xD8\xFF)
    if (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    ) {
      return { mime: 'image/jpeg', ext: '.jpg' };
    }

    return { mime: 'application/pdf', ext: '.pdf' };
  }
}
