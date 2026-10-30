# Avance 06 · Seguridad, auditoría Lighthouse y entorno limpio

Fecha: 2026-10-29 · Cronograma PRD: S2 · D4 (parte) · Cubre RNF-04, RNF-01, RNF-08, RNF-11 y la meta de 100 % PWA

## Qué se hizo

**Cabeceras de seguridad (RNF-04)** en `apps/web/security-headers.conf`, incluido en cada `location` de la web (no en `/api/`: Swagger UI necesita scripts en línea):

- `Content-Security-Policy`: `default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`.
- `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` (geolocalización solo propia; cámara y micrófono cerrados) y `Strict-Transport-Security` (los navegadores lo ignoran sobre HTTP; surte efecto detrás de un túnel o proxy HTTPS).
- `offline.html` ya no lleva `<style>` en línea (la CSP lo bloquearía): sus estilos están en `public/offline.css`, que el SW precachea.
- `public/robots.txt` (antes el fallback de la SPA devolvía `index.html` como si fuera `robots.txt`).

**Auditoría** (contra el contenedor de producción, `http://localhost:8080`; reportes en `doc/evidencias/`):

| Herramienta | Resultado |
| --- | --- |
| Lighthouse 11.7.1, categoría PWA | **100 %**: `installable-manifest`, `splash-screen`, `themed-omnibox`, `content-width`, `viewport`, `maskable-icon`, todos en verde |
| Lighthouse 13.6.0, móvil, throttling simulado | **Rendimiento 97 · Accesibilidad 100 · Buenas prácticas 100 · SEO 100** |
| Métricas | LCP 2,4 s (meta ≤ 2,5) · TBT 100 ms (meta ≤ 200) · CLS 0,006 |
| Chrome (`Page.getInstallabilityErrors`) | `[]` |

**Entorno limpio (RNF-11)**: se copió solo lo versionable a un directorio nuevo (sin `node_modules`, `.env` ni código generado) y se probó desde cero:

- `npm ci` → lockfile sincronizado (756 paquetes), `npm run build:shared` y las 16 pruebas unitarias en verde.
- `docker compose up -d --build --wait` → **55 s**; PostgreSQL, API y web sanos, migración inicial aplicada, API respondiendo, 6 de 6 pruebas e2e de la API.

**Otros**: `README.md` (arranque, pruebas, auditoría, despliegue, limitaciones), `.github/workflows/ci.yml` (dos jobs: build + unitarias, y e2e con Docker + Playwright) y healthchecks de `web` en ambos compose (antes `--wait` no esperaba a Vite).

## Hallazgos y correcciones

- **`new Function` bloqueado por la CSP.** Lighthouse bajó "Buenas prácticas" a 96 por un `inspector-issues` de CSP (`kEvalViolation`). Zod 4 sondea `new Function("")` para optimizar parsers; el error se captura, pero una CSP estricta lo **reporta** igual. Arreglo: `z.config({ jitless: true })`, en `src/zod.ts`, importado **primero** en `main.tsx` (Zod decide al construir los esquemas, y `@fieldreport/shared` los construye al importarse). Buenas prácticas pasó de 96 a 100.
- **Mi prueba de CSP no lo había detectado.** Escuchaba solo la consola; esa violación solo aparece en el panel *Issues*. La prueba ahora escucha `Audits.issueAdded` por CDP. Comprobado en ambos sentidos: **falla** contra el build con el problema (mostrando la `kEvalViolation`) y **pasa** con el arreglo.
- Una primera edición de esa prueba no se aplicó (Prettier había reformateado el texto) y la prueba pasó sin detectar nada; se notó porque se la corrió contra el build malo antes de confiar en ella.

## Evidencia automática acumulada

| Capa | Resultado |
| --- | --- |
| Unitarias web (Vitest) | 16 de 16 |
| API e2e (PostgreSQL real) | 6 de 6 |
| Playwright contra nginx de producción | **15 de 15** (instalabilidad, manifest, offline, CRUD offline, sincronización ≤ 10 s, corte de red, Background Sync con la app cerrada, cabeceras, CSP sin violaciones, `offline.html` con estilos) |

## No verificado / límites

- **Los números de Lighthouse son de un contenedor local con throttling simulado** y de la pantalla de login (`start_url`); en un teléfono real y con la app autenticada pueden variar. Hay que repetirlos sobre la URL de producción.
- **PWABuilder y securityheaders.com** requieren una URL pública; pendientes hasta el despliegue.
- **El workflow de CI no se ejecutó** (no hay repositorio remoto en esta sesión). Sí se validó que el YAML parsea, que los compose son válidos y que cada comando equivalente funciona en local.
- **Lighthouse CI** (`@lhci/cli`, con umbrales) quedó fuera; hoy la auditoría es manual.
- La categoría "agentic-browsing" de Lighthouse 13 (50 %) se ignora: mide `llms.txt` y un manifiesto ARD, irrelevantes para esta app.
- **ESLint y Husky no están configurados** (RNF-10 los menciona). Hay TypeScript estricto y Prettier.
- La CSP actual cubre el despliegue con nginx. Si la API queda en otro origen, `connect-src` debe incluirlo.

## Pendiente / siguiente

- Despliegue público con HTTPS (web en Vercel/Netlify y API + PostgreSQL en Render/Railway/Fly): requiere cuentas y decisiones del equipo.
- Pruebas en un Android con Chrome y un iPhone con Safari (instalación real, modo avión, botón "Instalar app", geolocalización).
- PWABuilder, securityheaders.com y capturas del panel *Application* sobre la URL pública.
- Fotos comprimidas y firma (RF-03, RF-04); ESLint; Lighthouse CI.
