//organiza modulos, controllers e providers

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ContratosController } from './controllers/contratosController';
import { AsaasWebhookController } from './controllers/asaas-webhook.controller';
import { DadosRecebimentoProprietarioController } from './controllers/dados-recebimento-proprietario.controller';
import { AsaasWebhookService } from './services/asaas-webhook.service';
import { AsaasCobrancaService } from './services/asaas-cobranca.service';
import { AsaasRepasseService } from './services/asaas-repasse.service';
import { DadosRecebimentoCriptoService } from './services/dados-recebimento-cripto.service';
import { DadosRecebimentoProprietarioService } from './services/dados-recebimento-proprietario.service';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ImoveisController } from './controllers/imoveisController';
import { Imovel } from './database/entities/imovel.entity';

import { CadastroController } from './controllers/cadastroController';
import { Usuario } from './database/entities/usuario.entity';
import { Perfil } from './database/entities/perfil.entity';
import { Prestador } from './database/entities/prestador.entity';
import { Contrato } from './database/entities/contrato.entity';
import { Fatura } from './database/entities/fatura.entity';
import { AsaasWebhookEvento } from './database/entities/asaas-webhook-evento.entity';
import { Repasse } from './database/entities/repasse.entity';


//arquivo que indica a composição do site ao nest

@Module({
  imports: [ //importa outros modulos
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get<string>('DB_HOST'),
        port: Number(configService.get<string>('DB_PORT')),
        username: configService.get<string>('DB_USERNAME'),
        password: configService.get<string>('DB_PASSWORD'),
        database: configService.get<string>('DB_DATABASE'),

       autoLoadEntities: true,
       synchronize: false,
      }),
    }), 
    AuthModule,
    TypeOrmModule.forFeature([Imovel, Usuario, Perfil, Contrato, Fatura, AsaasWebhookEvento, Repasse, Prestador])//forFeature registra repositorios dessas entidades
    //repositorio = objeto para realizar operacoes comco banco
  ],
 

  controllers: [ //registra classes de controladores
    AppController,
    ImoveisController,
    CadastroController,
    ContratosController,
    AsaasWebhookController,
    DadosRecebimentoProprietarioController,
  ],
  providers: [
    AppService,
    AsaasWebhookService,
    AsaasCobrancaService,
    AsaasRepasseService,
    DadosRecebimentoCriptoService,
    DadosRecebimentoProprietarioService,
  ],//registra serviços e outros
})
export class AppModule {}
