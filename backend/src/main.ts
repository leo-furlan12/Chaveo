import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule); //cria app usando componente app module
  app.enableCors();//comunicação entre frontend em outra porta
  
  const port = process.env.PORT || 4000; //backend espera requisições na porta 4000
  await app.listen(port);
}
bootstrap();