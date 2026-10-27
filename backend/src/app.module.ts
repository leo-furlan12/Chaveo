//organiza modulos, controllers e providers

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { ContratosController } from './controllers/contratosController';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ImoveisController } from './controllers/imoveisController';
import { Imovel } from './database/entities/imovel.entity';

import { CadastroController } from './controllers/cadastroController';
import { Usuario } from './database/entities/usuario.entity';
import { Perfil } from './database/entities/perfil.entity';
import { Prestador } from './database/entities/prestador.entity';
import { Contrato } from './database/entities/contrato.entity';


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
    TypeOrmModule.forFeature([Imovel, Usuario, Perfil, Contrato])//forFeature registra repositorios dessas entidades 
    //repositorio = objeto para realizar operacoes comco banco
  ],
 

  controllers: [ //registra classes de controladores
    AppController,
    ImoveisController,
    CadastroController,
    ContratosController,
  ],
  providers: [AppService],//registra serviços e outros
})
export class AppModule {}