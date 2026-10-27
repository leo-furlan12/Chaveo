// src/controllers/cadastroController.ts
import { Controller, Post, Body, BadRequestException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';

import { Usuario } from '../database/entities/usuario.entity';
import { Perfil } from '../database/entities/perfil.entity';

@Controller('cadastro')
export class CadastroController {
  constructor(private readonly dataSource: DataSource) {}

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
    chave_pix,
    perfil,
    cidade,
    estado,
    categoria_id,
    descricao,
  } = body;

  if (!nome || !cpf || !email || !senha || !perfil) {
    throw new BadRequestException('Preencha todos os campos obrigatórios.');
  }

  const cpfLimpo = cpf.replace(/\D/g, '');
  const telefoneLimpo = telefone ? telefone.replace(/\D/g, '') : null;

  if (cpfLimpo.length !== 11) {
    throw new BadRequestException('CPF deve conter exatamente 11 dígitos.');
  }

  try {
    const resultado = await this.dataSource.transaction(async (manager) => {
 
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
          chave_pix: chave_pix || null,
          ativo: true,
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
            `INSERT INTO prestadores ( usuario_id, descricao, cidade, estado)
             VALUES ( $1, $2, $3, $4) RETURNING id`,
            [usuarioSalvo.id, descricao || '', cidade || '', estado || ''],
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
    if (error instanceof BadRequestException) {
      throw error;
    }
    throw new BadRequestException(error.message || 'Erro ao realizar cadastro.');
  }
}}