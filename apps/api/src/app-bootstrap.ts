import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { AppModule } from './app.module';

// compression é CommonJS; import default falha em runtime
const compression = require('compression') as () => express.RequestHandler;

/** Cria a aplicação Nest (sem listen). Usado por main.ts e pelo handler serverless da Vercel. */
export async function createApp(): Promise<NestExpressApplication> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  try {
    const raw = process.env.CORS_ORIGINS;
    const corsOrigins = typeof raw === 'string'
      ? raw.split(',').map((o) => o.trim()).filter(Boolean)
      : [];
    if (corsOrigins.length > 0) {
      app.enableCors({ origin: corsOrigins, credentials: true });
    } else {
      app.enableCors({ origin: true, credentials: true });
    }
  } catch (e) {
    console.warn('[app-bootstrap] CORS config failed, allowing all origins', e);
    app.enableCors({ origin: true, credentials: true });
  }
  app.use(compression());
  app.setGlobalPrefix('v1');
  app.use('/v1/payments/stripe-webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '10mb' }));
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
