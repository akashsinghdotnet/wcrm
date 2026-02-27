import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
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
  // IMPORTANT: origin '*' with credentials: true is invalid per CORS spec
  // and causes browsers to block all requests (network errors).
  const envOrigins = (process.env.FRONTEND_URL || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

  const allowedOrigins = [
    ...new Set([
      'https://app.magnetcrm.com',
      'http://localhost:5173',
      ...envOrigins,
    ]),
  ];

  app.enableCors({
    origin: allowedOrigins.length === 1 ? allowedOrigins[0] : allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Increase payload size limits for Base64 ticket attachments
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));

  const server = app.getHttpServer();
  // Ensure Node.js keepAlive timeout is longer than NGINX's default (60s)
  // to prevent intermittent 502 Bad Gateway / Network Errors
  server.keepAliveTimeout = 65000;
  server.headersTimeout = 66000;

  await app.listen(process.env.PORT ?? 3000);
  console.log(`MagnetCRM API running on http://localhost:${process.env.PORT ?? 3000}/api`);
}
bootstrap();
