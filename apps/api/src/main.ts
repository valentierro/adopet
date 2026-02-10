import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.setGlobalPrefix('v1');
  // Webhook Stripe precisa do body bruto para validar assinatura
  app.use('/v1/payments/stripe-webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '10mb' }));
  // Fotos do seed: prisma/seed-images (dogs/1.png, cats/1.png, etc.) em /v1/seed-photos
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

  const port = process.env.PORT ?? 3000;
  const host = process.env.HOST ?? '0.0.0.0';
  await app.listen(port, host);
  console.log(`Adopet API running at http://localhost:${port}/v1`);
  if (host === '0.0.0.0') {
    console.log('  (acessível na rede: use o IP desta máquina no EXPO_PUBLIC_API_URL do app)');
  }
  console.log(`Swagger at http://localhost:${port}/api/docs`);
}
bootstrap();
