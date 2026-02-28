import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { AppModule } from './app.module';
import { validateRequiredEnv } from './env-validation';
import { StructuredLogger, patchConsoleToStructuredLogger } from './logger/structured-logger';

validateRequiredEnv();

const structuredLogger = new StructuredLogger();
StructuredLogger.setInstance(structuredLogger);
patchConsoleToStructuredLogger();

// compression é opcional: na Vercel o módulo pode não estar no bundle
let compressionMiddleware: express.RequestHandler | null = null;
try {
  const compression = require('compression') as () => express.RequestHandler;
  compressionMiddleware = compression();
} catch {
  // ignora em ambiente serverless onde compression não está disponível
}

// Helmet: headers de segurança (X-Content-Type-Options, X-Frame-Options, etc.)
let helmetMiddleware: express.RequestHandler | null = null;
try {
  const helmet = require('helmet') as (opts?: { contentSecurityPolicy?: boolean }) => express.RequestHandler;
  helmetMiddleware = helmet({ contentSecurityPolicy: false }); // CSP desabilitado: a página set-password define o seu próprio; o padrão bloqueava scripts e quebrava o formulário
} catch {
  // ignora se helmet não estiver no bundle
}

/** Cria a aplicação Nest (sem listen). Usado por main.ts e pelo handler serverless da Vercel. */
export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
    logger: structuredLogger,
  });
  if (compressionMiddleware) app.use(compressionMiddleware);
  if (helmetMiddleware) app.use(helmetMiddleware);
  // CORS: na Vercel é aplicado em api/index.ts; localmente habilitamos aqui para app web e Expo Go
  const corsOrigins = process.env.CORS_ORIGINS?.split(',').map((s) => s.trim()).filter(Boolean) ?? [];
  app.enableCors({
    origin:
      corsOrigins.length > 0
        ? corsOrigins
        : (origin, cb) => {
            if (
              !origin ||
              /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
              /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin)
            ) {
              cb(null, true);
            } else {
              cb(null, false);
            }
          },
    credentials: true,
  });
  app.setGlobalPrefix('v1');
  app.use('/v1/payments/stripe-webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.useStaticAssets(join(process.cwd(), 'prisma', 'seed-images'), { prefix: '/v1/seed-photos/' });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const config = new DocumentBuilder()
    .setTitle('Adopet API')
    .setDescription('API para adoção de pets no Brasil')
    .setVersion('1.0')
    .addBearerAuth()
    .addServer('http://localhost:3000', 'Local (desenvolvimento)')
    .addServer('https://api.appadopet.com.br', 'Produção')
    .addTag('health')
    .addTag('auth')
    .addTag('me')
    .addTag('feed')
    .addTag('swipes')
    .addTag('reports')
    .addTag('blocks')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  return app;
}
