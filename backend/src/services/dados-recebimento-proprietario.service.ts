import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Usuario } from '../database/entities/usuario.entity';
import { DadosRecebimentoCriptoService } from './dados-recebimento-cripto.service';

type TipoChavePix = 'CPF' | 'CNPJ' | 'EMAIL' | 'PHONE' | 'EVP';
type TipoRecebimento = 'PIX' | 'CONTA_BANCARIA';

interface DadosRecebimentoEntrada {
  tipo: TipoRecebimento;
  pix?: { chave: string; tipoChave: TipoChavePix };
  contaBancaria?: {
    codigoBanco: string;
    agencia: string;
    digitoAgencia?: string;
    conta: string;
    digitoConta: string;
    tipoConta: 'CONTA_CORRENTE' | 'CONTA_POUPANCA';
    operacao: 'PIX' | 'TED';
    titularNome: string;
    titularDocumento: string;
  };
}

@Injectable()
export class DadosRecebimentoProprietarioService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly cripto: DadosRecebimentoCriptoService,
  ) {}

  async buscar(usuarioId: string) {
    const usuario = await this.buscarProprietario(usuarioId);
    return this.formatarResposta(usuario);
  }

  async salvar(usuarioId: string, entrada: DadosRecebimentoEntrada) {
    const usuario = await this.buscarProprietario(usuarioId);
    const dados = this.prepararDados(entrada);
    await this.usuarioRepository.update(usuario.id, dados);
    return this.formatarResposta(Object.assign(usuario, dados));
  }

  prepararDados(entrada: DadosRecebimentoEntrada): Partial<Usuario> {
    const dados = this.validarEntrada(entrada);
    const usuario: Partial<Usuario> = {};

    usuario.recebimento_tipo = dados.tipo;
    usuario.recebimento_pix_chave_cifrada = this.cripto.criptografar(
      dados.tipo === 'PIX' ? dados.pix!.chave : null,
    );
    usuario.recebimento_pix_tipo = dados.tipo === 'PIX' ? dados.pix!.tipoChave : null;
    usuario.recebimento_banco_codigo = dados.tipo === 'CONTA_BANCARIA'
      ? dados.contaBancaria!.codigoBanco
      : null;
    usuario.recebimento_banco_agencia_cifrada = this.cripto.criptografar(
      dados.tipo === 'CONTA_BANCARIA' ? dados.contaBancaria!.agencia : null,
    );
    usuario.recebimento_banco_agencia_digito_cifrado = this.cripto.criptografar(
      dados.tipo === 'CONTA_BANCARIA' ? dados.contaBancaria!.digitoAgencia || null : null,
    );
    usuario.recebimento_banco_conta_cifrada = this.cripto.criptografar(
      dados.tipo === 'CONTA_BANCARIA' ? dados.contaBancaria!.conta : null,
    );
    usuario.recebimento_banco_conta_digito_cifrado = this.cripto.criptografar(
      dados.tipo === 'CONTA_BANCARIA' ? dados.contaBancaria!.digitoConta : null,
    );
    usuario.recebimento_banco_tipo_conta = dados.tipo === 'CONTA_BANCARIA'
      ? dados.contaBancaria!.tipoConta
      : null;
    usuario.recebimento_banco_operacao = dados.tipo === 'CONTA_BANCARIA'
      ? dados.contaBancaria!.operacao
      : null;
    usuario.recebimento_titular_nome_cifrado = this.cripto.criptografar(
      dados.tipo === 'CONTA_BANCARIA' ? dados.contaBancaria!.titularNome : null,
    );
    usuario.recebimento_titular_documento_cifrado = this.cripto.criptografar(
      dados.tipo === 'CONTA_BANCARIA' ? dados.contaBancaria!.titularDocumento : null,
    );

    return usuario;
    //return this.formatarResposta(await this.usuarioRepository.save(usuario));
  }

  private async buscarProprietario(usuarioId: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({ where: { id: usuarioId } });
    if (!usuario) throw new NotFoundException('Usuário não encontrado.');

    const perfis = await this.usuarioRepository.manager.query(
      `SELECT 1 FROM usuarios_perfis up
       INNER JOIN perfis p ON p.id = up.perfil_id
       WHERE up.usuario_id = $1 AND p.nome = 'PROPRIETARIO' LIMIT 1`,
      [usuarioId],
    );
    if (!perfis.length) {
      throw new ForbiddenException('Apenas proprietários podem configurar o recebimento.');
    }

    return usuario;
  }

  private validarEntrada(entrada: DadosRecebimentoEntrada): DadosRecebimentoEntrada {
    if (!entrada || !['PIX', 'CONTA_BANCARIA'].includes(entrada.tipo)) {
      throw new BadRequestException('Selecione um destino Pix ou uma conta bancária.');
    }

    if (entrada.tipo === 'PIX') {
      const pix = entrada.pix;
      const tiposValidos: TipoChavePix[] = ['CPF', 'CNPJ', 'EMAIL', 'PHONE', 'EVP'];
      if (!pix || !tiposValidos.includes(pix.tipoChave) || typeof pix.chave !== 'string' || !pix.chave.trim()) {
        throw new BadRequestException('Informe uma chave Pix e seu tipo.');
      }
      const chave = pix.chave.trim();
      const digitos = chave.replace(/\D/g, '');
      const valida = pix.tipoChave === 'CPF'
        ? digitos.length === 11
        : pix.tipoChave === 'CNPJ'
          ? digitos.length === 14
          : pix.tipoChave === 'EMAIL'
            ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(chave)
            : pix.tipoChave === 'PHONE'
              ? digitos.length === 11
              : chave.length <= 100;
      if (!valida) throw new BadRequestException('A chave Pix não corresponde ao tipo informado.');
      return { tipo: 'PIX', pix: { chave: pix.tipoChave === 'CPF' || pix.tipoChave === 'CNPJ' || pix.tipoChave === 'PHONE' ? digitos : chave, tipoChave: pix.tipoChave } };
    }

    const conta = entrada.contaBancaria;
    if (
      !conta || typeof conta.codigoBanco !== 'string' || !/^\d{3}$/.test(conta.codigoBanco.trim()) ||
      ![conta.agencia, conta.conta, conta.digitoConta, conta.titularNome].every(
        (valor) => typeof valor === 'string' && valor.trim(),
      ) ||
      (conta.digitoAgencia != null && typeof conta.digitoAgencia !== 'string') ||
      !['CONTA_CORRENTE', 'CONTA_POUPANCA'].includes(conta.tipoConta) ||
      !['PIX', 'TED'].includes(conta.operacao)
    ) {
      throw new BadRequestException('Preencha os dados bancários obrigatórios.');
    }
    const documento = typeof conta.titularDocumento === 'string'
      ? conta.titularDocumento.replace(/\D/g, '')
      : '';
    if (!documento || ![11, 14].includes(documento.length)) {
      throw new BadRequestException('O CPF/CNPJ do titular deve conter 11 ou 14 números.');
    }
    return {
      tipo: 'CONTA_BANCARIA',
      contaBancaria: {
        ...conta,
        codigoBanco: conta.codigoBanco.trim(),
        agencia: conta.agencia.trim(),
        conta: conta.conta.trim(),
        digitoConta: conta.digitoConta.trim(),
        digitoAgencia: conta.digitoAgencia?.trim(),
        titularNome: conta.titularNome.trim(),
        titularDocumento: documento,
      },
    };
  }

  private formatarResposta(usuario: Usuario) {
    if (usuario.recebimento_tipo === 'PIX') {
      return {
        tipo: 'PIX',
        pix: {
          chave: this.cripto.descriptografar(usuario.recebimento_pix_chave_cifrada),
          tipoChave: usuario.recebimento_pix_tipo,
        },
      };
    }
    if (usuario.recebimento_tipo === 'CONTA_BANCARIA') {
      return {
        tipo: 'CONTA_BANCARIA',
        contaBancaria: {
          codigoBanco: usuario.recebimento_banco_codigo,
          agencia: this.cripto.descriptografar(usuario.recebimento_banco_agencia_cifrada),
          digitoAgencia: this.cripto.descriptografar(usuario.recebimento_banco_agencia_digito_cifrado),
          conta: this.cripto.descriptografar(usuario.recebimento_banco_conta_cifrada),
          digitoConta: this.cripto.descriptografar(usuario.recebimento_banco_conta_digito_cifrado),
          tipoConta: usuario.recebimento_banco_tipo_conta,
          operacao: usuario.recebimento_banco_operacao,
          titularNome: this.cripto.descriptografar(usuario.recebimento_titular_nome_cifrado),
          titularDocumento: this.cripto.descriptografar(usuario.recebimento_titular_documento_cifrado),
        },
      };
    }
    return { tipo: null, pix: null, contaBancaria: null };
  }
}
