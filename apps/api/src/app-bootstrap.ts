import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { AppModule } from './app.module';

// compression é opcional: na Vercel o módulo pode não estar no bundle
let compressionMiddleware: express.RequestHandler | null = null;
try {
  const compression = require('compression') as () => express.RequestHandler;
  compressionMiddleware = compression();
} catch {
  // ignora em ambiente serverless onde compression não está disponível
}

/** Cria a aplicação Nest (sem listen). Usado por main.ts e pelo handler serverless da Vercel. */
export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  if (compressionMiddleware) app.use(compressionMiddleware);
  // CORS é aplicado no handler da Vercel (api/index.ts) e em vercel.json
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
