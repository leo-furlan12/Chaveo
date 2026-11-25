import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class DadosRecebimentoCriptoService {
  private obterChave(): Buffer {
    const chaveBase64 = process.env.PAYOUT_DATA_ENCRYPTION_KEY;
    const chave = chaveBase64 ? Buffer.from(chaveBase64, 'base64') : Buffer.alloc(0);

    if (chave.length !== 32) {
      throw new ServiceUnavailableException(
        'Configure PAYOUT_DATA_ENCRYPTION_KEY com uma chave Base64 de 32 bytes.',
      );
    }

    return chave;
  }

  criptografar(valor: string | null): string | null {
    if (valor === null) return null;

    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.obterChave(), iv);
    const cifrado = Buffer.concat([
      cipher.update(valor, 'utf8'),
      cipher.final(),
    ]);

    return `v1:${iv.toString('base64')}:${cipher.getAuthTag().toString('base64')}:${cifrado.toString('base64')}`;
  }

  descriptografar(valorCifrado: string | null): string | null {
    if (valorCifrado === null) return null;

    const [versao, ivBase64, tagBase64, dadosBase64] = valorCifrado.split(':');
    if (versao !== 'v1' || !ivBase64 || !tagBase64 || dadosBase64 === undefined) {
      throw new ServiceUnavailableException('Os dados de recebimento estão inválidos.');
    }

    try {
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.obterChave(),
        Buffer.from(ivBase64, 'base64'),
      );
      decipher.setAuthTag(Buffer.from(tagBase64, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(dadosBase64, 'base64')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível descriptografar os dados de recebimento. Verifique a chave configurada.',
      );
    }
  }
}
