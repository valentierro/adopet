/**
 * Gera o OpenAPI spec (openapi.json) para documentação e Swagger UI standalone.
 * Rode: pnpm exec ts-node --compiler-options '{"module":"CommonJS"}' scripts/generate-openapi.ts
 *
 * Usa variáveis dummy para não precisar de banco/credenciais.
 */
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://x:x@localhost:5432/x';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'temp-for-openapi-generation';

import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { AppModule } from '../src/app.module';

async function generate() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('v1');

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

  const outPath = join(__dirname, '../../docs/swagger/openapi.json');
  writeFileSync(outPath, JSON.stringify(document, null, 2), 'utf-8');
  console.log('OpenAPI spec gerado em:', outPath);

  await app.close();
}

generate().catch((e) => {
  console.error(e);
  process.exit(1);
});
