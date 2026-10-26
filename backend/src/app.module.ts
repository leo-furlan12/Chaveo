import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ImoveisController } from './controllers/imoveisController';
import { Imovel } from './database/entities/imovel.entity';

import { CadastroController } from './controllers/cadastroController';
import { Usuario } from './database/entities/usuario.entity';
import { Perfil } from './database/entities/perfil.entity';
import { Prestador } from './database/entities/prestador.entity';

@Module({
  imports: [
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
        synchronize: true,
      }),
    }),
    
    TypeOrmModule.forFeature([Imovel, Usuario])
  ],

  controllers: [
    AppController,
    ImoveisController,
    CadastroController
  ],
  providers: [AppService],
})
export class AppModule {}