# Avance 03 · Cascarón PWA: manifest, Service Worker, offline y Docker de la web

Fecha: 2026-10-29 · Cronograma PRD: S2 · D1 y D2 (parte) · Cubre RF-13, RF-14, RF-15, RF-16, RF-17

Se reordenó el plan: como la UI debe leer y escribir solo en IndexedDB, primero va el cascarón PWA y después la captura de reportes (avance 04) directamente sobre Dexie, sin construir antes una versión "online" que haya que reescribir.

## Qué se hizo

**Web (`apps/web`)**: React 19 + Vite 8 + Tailwind 4 + TypeScript estricto, con `vite-plugin-pwa` 2.0 en modo `injectManifest` (el Service Worker lo escribimos nosotros en `src/sw.ts`).

- **Manifest**: `name`, `short_name`, `id`, `start_url`, `scope`, `display: standalone`, `theme_color`, `background_color`, íconos 64/192/512 y uno `maskable` 512. Los PNG se generan desde `public/favicon.svg` con `npm run icons -w @fieldreport/web` (incluye `apple-touch-icon` 180×180 y `favicon.ico`).
- **`index.html`**: `viewport` con `viewport-fit=cover`, `theme-color`, `apple-touch-icon` y metas `apple-mobile-web-app-*` para iOS.
- **Service Worker (`src/sw.ts`)**:
  - *install*: precachea el App Shell (18 archivos, 243 KiB, incluye `index.html` y `offline.html`).
  - *activate*: `clientsClaim()`, limpia precachés viejos y borra cualquier caché que esta versión ya no use.
  - *fetch*: (1) toda navegación de la SPA se responde con el `index.html` precacheado; (2) navegaciones fuera de la SPA (p. ej. `/api/docs`) van a la red y, si falla, `catch handler` responde `/offline.html`; (3) `GET /api/v1/reports` usa Network First con timeout de 3 s y copia en caché `api-reports-v1`; (4) POST/PUT/DELETE no se interceptan.
  - La actualización espera a que el usuario acepte: el SW escucha `SKIP_WAITING`.
- **UI**: `NetworkBadge` (En línea / Sin conexión), `InstallButton` (botón propio con `beforeinstallprompt`, y guía "Compartir → Añadir a pantalla de inicio" en iOS/iPadOS) y `UpdateBanner` ("Hay una actualización · Recargar" y "Lista para usarse sin conexión").
- **`public/offline.html`**: página de contingencia autónoma (CSS en línea).

**Docker**

- `apps/web/Dockerfile` multi-stage: `dev` (Vite), `build` y `prod` (nginx).
- `apps/web/nginx.conf`: `sw.js`, `index.html`, `offline.html` y el manifest con `Cache-Control: no-cache`; `/assets/*` con `immutable` a un año; manifest como `application/manifest+json`; fallback de SPA; y proxy `/api/` hacia la API.
- `docker-compose.yml` ahora tiene `db`, `api`, `web` y el perfil `tunnel` (Ngrok). `docker-compose.prod.yml` levanta la versión de producción local en `http://localhost:8080` (proyecto `fieldreport-prod`, aparte del de desarrollo).

## Evidencia (Chromium real, Playwright 1.64)

`apps/web/e2e/` contiene 6 pruebas. Resultado contra el contenedor nginx de producción: **6 de 6 pasan**; las 4 de PWA también pasan contra `vite preview`.

| Prueba | Qué demuestra |
| --- | --- |
| Instalable | `Page.getInstallabilityErrors` de Chrome devuelve `[]` (mismo criterio que usa Chrome para ofrecer instalar) |
| Manifest | campos exigidos, íconos 192/512/maskable, todos responden 200 |
| Abre sin conexión | tras una visita con red, `setOffline(true)` + recargar sigue mostrando la app y la insignia "Sin conexión" |
| Ruta fuera de la SPA sin red | responde `/offline.html` |
| Cabeceras nginx | `sw.js` no-cache, manifest con su tipo, `/assets/*` immutable |
| Proxy y SPA | `/api/v1/health` llega a la API a través de nginx; una ruta inexistente cae en `index.html` |

- **Control negativo**: la misma prueba offline con los Service Workers bloqueados falla con `ERR_INTERNET_DISCONNECTED`, así que la prueba sí mide al SW.
- El SW de **desarrollo** (`devOptions`) también se registra, controla la página y no reporta errores de instalabilidad ni de consola (comprobado contra `localhost:5173`), por lo que el túnel puede apuntar al servidor de desarrollo.

Cómo repetirlo:

```bash
docker compose -f docker-compose.prod.yml up -d --build --wait    # http://localhost:8080
docker run --rm --network host --ipc=host -v "$PWD":/work -w /work/apps/web \
  --user "$(id -u):$(id -g)" -e HOME=/tmp -e BASE_URL=http://localhost:8080 \
  mcr.microsoft.com/playwright:v1.64.1-noble npx playwright test
```

## Checklist de instalación del PRD (sección 7)

- [x] Servida por HTTPS o `localhost` — solo `localhost` verificado; falta HTTPS real (túnel o Vercel)
- [x] `manifest.webmanifest` válido y enlazado
- [x] `name`, `short_name`, `start_url`, `scope`, `display: standalone`, `theme_color`, `background_color`
- [x] Íconos 192×192, 512×512 y `maskable`
- [x] Service Worker registrado y activo con `fetch`
- [x] Responde 200 offline en `start_url`
- [x] `viewport` y `theme-color`
- [x] `apple-touch-icon` 180×180

## Decisiones y desviaciones del PRD

- **HTML: precaché + ruta de navegación, no Stale-While-Revalidate.** El `index.html` precacheado ya se sirve al instante y se renueva cuando sale un SW nuevo; además garantiza que la app abra offline desde la primera visita. Un SWR con caché propia estaría vacío hasta la segunda visita. Para la defensa: es una estrategia más fuerte, no una omisión.
- **Sin ruta Cache First.** Íconos y estilos son locales y ya están precacheados; no hay fuentes ni imágenes externas. Se añade si aparece alguno.
- **API en el mismo origen.** El compose del PRD pone `VITE_API_URL=http://localhost:3000`, que un celular no puede alcanzar a través del túnel. Aquí Vite (dev) y nginx (prod) hacen proxy de `/api`, y el cliente usará `/api/v1`. En Vercel + API externa se pasará `VITE_API_URL` absoluta al build.
- **Playwright corre en la imagen oficial de Microsoft.** Este WSL no tiene `apt` y faltan 13 librerías del sistema para Chromium (`libnspr4`, `libnss3`…). El contenedor evita instalar nada en el host y es lo mismo que usaría el CI.
- **Playwright usa `webServer` con `vite preview`** (el build real) salvo que se pase `BASE_URL`.

## Riesgos y cosas que NO se verificaron

- **Botón "Instalar app"**: `beforeinstallprompt` solo se dispara en Chrome con interfaz; en headless se comprobó la instalabilidad, no el clic. Falta prueba en un Android real.
- **Instalación en iOS**: no hay iPhone en esta sesión; la guía visual está implementada pero sin probar.
- **Flujo de actualización (UC-06)**: el código existe, pero no hay prueba automática; se verificará a mano publicando dos versiones.
- **Túnel Ngrok**: el servicio está en el compose pero no se probó (falta `NGROK_AUTHTOKEN`).
- **Caché de la lista de reportes**: `api-reports-v1` guarda respuestas autenticadas. Hay que borrarla al cerrar sesión (RNF-06); queda para el avance 04, cuando exista el login en la web.
- **Cabeceras de seguridad** (CSP, HSTS, `X-Content-Type-Options`, RNF-04): pendientes para el avance de auditoría.
- **`npm audit`**: 4 hallazgos *low* (`deepmerge` dentro de `workbox-build`, solo herramienta de build, no llega al navegador). El "fix" que ofrece npm es bajar `vite-plugin-pwa` a 0.2.1, así que no se aplicó.

## Pendiente / siguiente

- Avance 04: login, Dexie (IndexedDB), formulario de reporte con validación Zod, listado y detalle offline (RF-01, RF-05, RF-08, RF-09, RF-10, RNF-12).
- Avance 05: cola de sincronización con backoff, idempotencia extremo a extremo, `online`/botón manual/Background Sync (RF-06, RF-07, RF-12).
