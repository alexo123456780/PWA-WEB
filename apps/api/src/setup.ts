import type { INestApplication } from '@nestjs/common';

// Compartido por main.ts y las pruebas e2e para que ambos corran igual.
export function configureApp(app: INestApplication) {
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',') });
}
