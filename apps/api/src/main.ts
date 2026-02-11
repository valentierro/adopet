import { createApp } from './app-bootstrap';

async function bootstrap() {
  const app = await createApp();
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
