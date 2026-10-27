import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { Usuario } from '../database/entities/usuario.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';//biblioteca de token

//arquivo indicado pelo app.modules que mostra que tem controllers e providers 

@Module({
    imports: [TypeOrmModule.forFeature([Usuario]), JwtModule.register({
        secret: 'chave-temporaria',
        signOptions: {
            expiresIn: '1h',//expira em uma hora
        },
    }),
    ],
    //imports = 
    //usar repositorio da entidade usuario
    controllers: [AuthController], //controllers recebe requisições http
    providers: [AuthService],//providers recebe logicas
})
export class AuthModule {

}