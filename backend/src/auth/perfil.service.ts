import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { QueryFailedError, Repository } from 'typeorm';
import { Prestador } from '../database/entities/prestador.entity';
import { Usuario } from '../database/entities/usuario.entity';

const camposPessoais = {
  nome: 150,
  email: 255,
  telefone: 20,
  rg: 20,
  nacionalidade: 80,
  estado_civil: 30,
  profissao: 150,
} as const;

const camposPrestador = { cidade: 100, estado: 2, descricao: 5000 } as const;

@Injectable()
export class PerfilService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarios: Repository<Usuario>,
  ) {}

  async consultar(id: string) {
    const usuario = await this.usuarios.findOne({
      where: { id },
      select: {
        nome: true, cpf: true, email: true, telefone: true, rg: true,
        nacionalidade: true, estado_civil: true, profissao: true,
      },
    });
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');

    const perfis: { nome: string }[] = await this.usuarios.manager.query(
      'SELECT p.nome FROM usuarios_perfis up JOIN perfis p ON p.id = up.perfil_id WHERE up.usuario_id = $1 ORDER BY p.nome',
      [id],
    );
    const prestador = await this.usuarios.manager.findOne(Prestador, {
      where: { usuario_id: id },
      select: { cidade: true, estado: true, descricao: true, categoria_id: true },
    });

    return { ...usuario, perfis: perfis.map(({ nome }) => nome), prestador };
  }

  async atualizar(id: string, dados: Record<string, unknown>) {
    if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
      throw new BadRequestException('Dados de perfil inválidos.');
    }

    const alteracoes: Partial<Usuario> = {};
    for (const campo of Object.keys(camposPessoais) as (keyof typeof camposPessoais)[]) {
      if (dados[campo] === undefined) continue;
      const valor = dados[campo];
      if (typeof valor !== 'string' || valor.trim().length > camposPessoais[campo]) {
        throw new BadRequestException(`Valor inválido para ${campo}.`);
      }
      Object.assign(alteracoes, { [campo]: valor.trim() || null });
    }

    if (dados.nome !== undefined && (!alteracoes.nome || alteracoes.nome.length < 3)) {
      throw new BadRequestException('Informe seu nome.');
    }
    if (dados.email !== undefined && (!alteracoes.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(alteracoes.email))) {
      throw new BadRequestException('Informe um e-mail válido.');
    }
    if (alteracoes.telefone) {
      alteracoes.telefone = alteracoes.telefone.replace(/\D/g, '');
      if (!/^\d{10,11}$/.test(alteracoes.telefone)) {
        throw new BadRequestException('Informe um telefone com DDD.');
      }
    }

    const novaSenha = dados.nova_senha;
    if (novaSenha !== undefined && (
      typeof novaSenha !== 'string' || novaSenha.length < 6 ||
      Buffer.byteLength(novaSenha, 'utf8') > 72 ||
      !/[a-z]/i.test(novaSenha) || !/\d/.test(novaSenha) || !/[^a-z0-9\s]/i.test(novaSenha)
    )) {
      throw new BadRequestException('A nova senha deve ter pelo menos 6 caracteres, com letra, número e símbolo, e até 72 bytes.');
    }

    try {
      await this.usuarios.manager.transaction(async (manager) => {
        const usuario = await manager.findOne(Usuario, {
          where: { id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!usuario) throw new NotFoundException('Usuário não encontrado.');

        if (alteracoes.email === usuario.email) delete alteracoes.email;
        if (alteracoes.email || typeof novaSenha === 'string') {
          if (typeof dados.senha_atual !== 'string' ||
            !await bcrypt.compare(dados.senha_atual, usuario.senha_hash)) {
            throw new ForbiddenException('Informe a senha atual correta para alterar e-mail ou senha.');
          }
        }
        if (typeof novaSenha === 'string') alteracoes.senha_hash = await bcrypt.hash(novaSenha, 10);

        if (Object.keys(alteracoes).length) await manager.update(Usuario, id, alteracoes);

        if (dados.prestador !== undefined) {
          const prestador = await manager.findOne(Prestador, { where: { usuario_id: id } });
          if (!prestador) throw new ForbiddenException('Sua conta não possui cadastro de prestador.');
          const dadosPrestador = dados.prestador;
          if (!dadosPrestador || typeof dadosPrestador !== 'object' || Array.isArray(dadosPrestador)) {
            throw new BadRequestException('Dados de prestador inválidos.');
          }

          const campos = dadosPrestador as Record<string, unknown>;
          for (const campo of Object.keys(camposPrestador) as (keyof typeof camposPrestador)[]) {
            const valor: unknown = campos[campo];
            if (valor === undefined) continue;
            if (typeof valor !== 'string' || valor.trim().length > camposPrestador[campo]) {
              throw new BadRequestException(`Valor inválido para ${campo}.`);
            }
            if (campo === 'estado' && valor.trim() && !/^[a-z]{2}$/i.test(valor.trim())) {
              throw new BadRequestException('Informe a UF com duas letras.');
            }
            prestador[campo] = campo === 'estado' ? valor.trim().toUpperCase() : valor.trim();
          }

          const categoria: unknown = campos.categoria_id;
          if (categoria !== undefined) {
            if (categoria !== null && (typeof categoria !== 'number' || !Number.isInteger(categoria) || categoria < 1 || categoria > 8)) {
              throw new BadRequestException('Categoria de serviço inválida.');
            }
            prestador.categoria_id = categoria;
          }

          await manager.save(Prestador, prestador);
        }
      });
    } catch (erro) {
      if (erro instanceof QueryFailedError && (erro.driverError as { code?: string }).code === '23505') {
        throw new ConflictException('Já existe uma conta com este e-mail.');
      }
      throw erro;
    }

    return this.consultar(id);
  }
}
