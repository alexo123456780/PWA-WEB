import { defineConfig } from 'vitest/config';

// Config aparte de vite.config.ts: las pruebas no necesitan el plugin PWA ni Tailwind.
export default defineConfig({ test: { include: ['src/**/*.test.ts'] } });
