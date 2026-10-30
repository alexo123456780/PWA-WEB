import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  // `prisma generate` no se conecta, así que basta un valor vacío durante el build de la imagen.
  datasource: { url: process.env.DATABASE_URL ?? '' },
});
