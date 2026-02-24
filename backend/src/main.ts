import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global API prefix — all routes become /api/...
  app.setGlobalPrefix('api');

  // Validate all incoming request bodies using DTO decorators
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // Strip properties not in DTO
      forbidNonWhitelisted: true, // Throw error if unknown properties sent
      transform: true,            // Auto-transform payloads to DTO types
    }),
  );

  // Exclude @Exclude() fields (like password) from API responses
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Allow requests from frontend (React/Next.js)
  app.enableCors({
    origin: '*', // In production, replace with your frontend domain
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`MagnetCRM API running on http://localhost:${process.env.PORT ?? 3000}/api`);
}
bootstrap();
