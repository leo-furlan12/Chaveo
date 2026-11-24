import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AsaasWebhookService } from '../services/asaas-webhook.service';

@Controller('webhooks/asaas')
export class AsaasWebhookController {
  constructor(private readonly asaasWebhookService: AsaasWebhookService) {}

  // Recebe notificações do Asaas sem JWT; a autenticação é feita pelo header próprio do webhook.
  @Post()
  @HttpCode(HttpStatus.OK)
  async receberNotificacao(
    @Headers('asaas-access-token') token: string | undefined,
    @Body() corpo: unknown,
  ) {
    return this.asaasWebhookService.receberEvento(
      token,
      corpo as Parameters<AsaasWebhookService['receberEvento']>[1],
    );
  }
}
