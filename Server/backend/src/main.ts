import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS
  app.enableCors({
    origin: '*', // Allows connections from any origin. Can be restricted in production.
    credentials: true,
  });

  // Enable Global Validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`\n🚀 Servidor NestJS rodando em: http://localhost:${port}`);
  console.log(`🔌 Socket.IO Gateway disponível em: http://localhost:${port}\n`);
}
bootstrap();
