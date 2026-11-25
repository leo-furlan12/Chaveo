// src/controllers/cadastroController.ts
import { Controller, Post, Body, BadRequestException, HttpException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Usuario } from '../database/entities/usuario.entity';
import { Perfil } from '../database/entities/perfil.entity';
import { Contrato } from '../database/entities/contrato.entity';
import { DadosRecebimentoProprietarioService } from '../services/dados-recebimento-proprietario.service';
@Controller('cadastro')
export class CadastroController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly dadosRecebimentoService: DadosRecebimentoProprietarioService,
  ) {}

@Post()
async cadastrar(@Body() body: any) {
  const {
    nome,
    cpf,
    email,
    telefone,
    senha,
    rg,
    nacionalidade,
    estado_civil,
    profissao,
    perfil,
    convite_token,
    dados_recebimento,
    cidade,
    estado,
    categoria_id,
    descricao,
  } = body;

  if (!nome || !cpf || !email || !senha || !perfil) {
    throw new BadRequestException('Preencha todos os campos obrigatórios.');
  }

  if (dados_recebimento !== undefined && perfil !== 'PROPRIETARIO') {
    throw new BadRequestException('Somente proprietários podem cadastrar dados de recebimento.');
  }

  const cpfLimpo = cpf.replace(/\D/g, '');
  const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null;

  if (cpfLimpo.length !== 11) {
    throw new BadRequestException('CPF deve conter exatamente 11 dígitos.');
  }

  try {
    const resultado = await this.dataSource.transaction(async (manager) => {
 
        if (convite_token !== undefined) {
          if (
            typeof convite_token !== 'string' ||
            !convite_token ||
            perfil !== 'INQUILINO'
          ) {
            throw new BadRequestException('Convite ou perfil inválido.');
          }

          const contrato = await manager.findOne(Contrato, {
            where: {
              convite_token,
              status: 'AGUARDANDO_INQUILINO',
            },
          });

          if (!contrato || contrato.cpf_locatario !== cpfLimpo) {
            throw new BadRequestException('Convite indisponível para este CPF.');
          }
        }
              
      const perfilEncontrado = await manager.findOne(Perfil, {
        where: { nome: perfil },
      });

      if (!perfilEncontrado) {
        throw new BadRequestException(`Perfil '${perfil}' não encontrado no sistema.`);
      }

      //busca duplicidade com o CPF  
      let usuarioSalvo = await manager.findOne(Usuario, {
        where: [{ email }, { cpf: cpfLimpo }],
      });

 
      if (convite_token !== undefined && usuarioSalvo) {
        throw new BadRequestException(
          'Já existe uma conta com esse CPF ou e-mail. Entre com a conta do CPF convidado.',
        );
      }

      if (usuarioSalvo && dados_recebimento !== undefined) {
        throw new BadRequestException('Para configurar o recebimento de uma conta existente, entre no dashboard.');
      }

      if (usuarioSalvo) {
        const relacaoExistente = await manager.query(
          `SELECT 1 FROM usuarios_perfis WHERE usuario_id = $1 AND perfil_id = $2 LIMIT 1`,
          [usuarioSalvo.id, perfilEncontrado.id],
        );

        if (relacaoExistente && relacaoExistente.length > 0) {
          throw new BadRequestException(
            `E-mail ou CPF já cadastrados para o perfil de ${perfil}.`,
          );
        }
      } else {
        
        const senhaHash = await bcrypt.hash(senha, 10);

        const novoUsuario = manager.create(Usuario, {
          nome,
          cpf: cpfLimpo, 
          email,
          telefone: telefoneLimpo,
          senha_hash: senhaHash,
          rg: rg || null,
          nacionalidade: nacionalidade || 'Brasileira',
          estado_civil: estado_civil || 'SOLTEIRO',
          profissao: profissao || null,
          ...(dados_recebimento === undefined
            ? {}
            : this.dadosRecebimentoService.prepararDados(dados_recebimento)),
        });

        usuarioSalvo = await manager.save(novoUsuario);
      }

      // relacionar o perfil
      await manager.query(
        `INSERT INTO usuarios_perfis (usuario_id, perfil_id) VALUES ($1, $2)`,
        [usuarioSalvo.id, perfilEncontrado.id],
      );

 
      if (perfil === 'PRESTADOR') {
        let resPrestador = await manager.query(
          `SELECT id FROM prestadores WHERE usuario_id = $1 LIMIT 1`,
          [usuarioSalvo.id],
        );

        let prestadorId = resPrestador[0]?.id;

        if (!prestadorId) {
          const insercaoPrestador = await manager.query(
            `INSERT INTO prestadores (usuario_id, descricao, cidade, estado, categoria_id)
             VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [
              usuarioSalvo.id,
              descricao || '',
              cidade || '',
              estado || '',
              /^[1-8]$/.test(String(categoria_id)) ? Number(categoria_id) : null,
            ],
          );
          prestadorId = insercaoPrestador[0]?.id;
        }
      }

      return usuarioSalvo;
    });

    return {
      message: 'Cadastro realizado com sucesso!',
      id: resultado.id,
    };
  } catch (error: any) {
    if (error instanceof HttpException) {
      throw error;
    }
    throw new BadRequestException(error.message || 'Erro ao realizar cadastro.');
  }
}}
