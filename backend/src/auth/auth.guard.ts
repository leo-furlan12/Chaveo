import {
    CanActivate,//essa classe consegue decidir se uma requisição pode continuar
    ExecutionContext,//dá acesso à requisição que está tentando entrar
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';//mesmo serviço do token, mas para verificar agora 
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
    constructor(private readonly jwtService: JwtService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<Request>();

        const authorization = request.headers.authorization;

        if (!authorization) {
            throw new UnauthorizedException('Token não informado');
        }

        const [type, token] = authorization.split(' ');

        if (type !== 'Bearer' || !token) {
            throw new UnauthorizedException('Token inválido');
        }

        try {
            const payload = await this.jwtService.verifyAsync(token);

(request as any).user = payload;        } catch {
            throw new UnauthorizedException('Token inválido ou expirado');
        }

        return true;
    }
}