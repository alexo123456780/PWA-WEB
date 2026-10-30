import { z } from 'zod';

// Debe evaluarse antes de que @fieldreport/shared construya sus esquemas (importar este módulo primero).
// jitless: Zod genera parsers con `new Function`, y una CSP estricta lo reporta como violación aunque falle en silencio.
// Los mensajes de validación salen en español.
z.config({ jitless: true, ...z.locales.es() });
