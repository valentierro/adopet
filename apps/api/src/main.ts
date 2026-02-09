import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('v1');
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
