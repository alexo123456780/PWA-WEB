import { defineConfig } from '@playwright/test';

// Con BASE_URL se prueba un despliegue ya levantado (p. ej. el contenedor nginx).
const baseURL = process.env.BASE_URL ?? 'http://localhost:4173';

export default defineConfig({
  testDir: 'e2e',
  use: { baseURL },
  // Se audita el build real: el servidor de desarrollo no refleja el precaché.
  webServer: process.env.BASE_URL
    ? undefined
    : {
        command: 'npm run build && npx vite preview --port 4173',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
