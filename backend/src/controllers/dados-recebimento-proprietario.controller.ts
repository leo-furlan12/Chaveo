import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { DadosRecebimentoProprietarioService } from '../services/dados-recebimento-proprietario.service';

@Controller('proprietarios/recebimento')
@UseGuards(AuthGuard)
export class DadosRecebimentoProprietarioController {
  constructor(private readonly dadosRecebimentoService: DadosRecebimentoProprietarioService) {}

  @Get()
  buscar(@Req() request: Request) {
    return this.dadosRecebimentoService.buscar(String((request as any).user.sub));
  }

  @Put()
  salvar(@Req() request: Request, @Body() dados: unknown) {
    return this.dadosRecebimentoService.salvar(
      String((request as any).user.sub),
      dados as Parameters<DadosRecebimentoProprietarioService['salvar']>[1],
    );
  }
}
