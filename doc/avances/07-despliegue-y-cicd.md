# Avance 07 · Repositorio, CI/CD y configuración de despliegue

Fecha: 2026-10-29 · Cronograma PRD: S2 · D5 (parcial) · Entregable final: repositorio de GitHub y despliegue en producción

## Qué se hizo

- **Commits convencionales** (4, con tema claro) y **push de `develop`** a `TOKYOMAN-ORG/PROYECTO_WEB`. La rama por defecto del remoto es `master`; no se tocó (ver "Pendiente").
- **CI (`.github/workflows/ci.yml`)**: `checks` (instalar, build de `shared`, API y web con chequeo de tipos del SW, pruebas unitarias) y `e2e` (pruebas de la API contra PostgreSQL, producción local con Docker y Playwright en Chromium).
- **CD de la web (`deploy-web`, mismo workflow)**: solo en `push` a `master`, solo si `checks` y `e2e` pasaron y solo si el repositorio tiene los secretos `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`. Sin ellos escribe un aviso y se omite, en vez de fallar. Usa el CLI de Vercel fijado en 65.8.0 (`pull` → `build --prod` → `deploy --prebuilt --prod`).
- **`vercel.json`** (raíz): comandos de instalación y build del monorepo, salida `apps/web/dist` y las mismas cabeceras que `nginx.conf` (CSP, HSTS, `sw.js`/`index.html`/`offline.html` sin caché, manifest como `application/manifest+json`, `/assets/*` immutable).
- **`render.yaml`** (Blueprint): API con la imagen `prod` de `apps/api/Dockerfile`, PostgreSQL, `JWT_SECRET` generado por Render, healthcheck en `/api/v1/health` y redespliegue con cada commit. `DEMO_EMAIL`, `DEMO_PASSWORD` y `CORS_ORIGIN` se piden al crear el Blueprint y no se guardan en el repo.

## Verificado y no verificado

- ✅ Los tres archivos de configuración parsean (YAML/JSON) y los compose siguen válidos.
- ✅ Cada paso del CI se ejecutó antes por separado y en limpio: `npm ci` en un clon sin dependencias, builds de API y web, 16 pruebas unitarias, 6 de la API y 15 E2E contra el contenedor de producción.
- ⬜ **El workflow no se ha visto correr en GitHub**: el repo es privado y esta sesión no tiene token de GitHub ni `gh`, así que no puedo leer el resultado de Actions.
- ⬜ **Nada está desplegado todavía** (ver abajo). Tampoco se probó `vercel build` ni el Blueprint de Render.

## Por qué no hay despliegue todavía

Lo que falta depende de cuentas y permisos que solo tiene el equipo:

1. **Vercel no puede leer el repo de la organización.** Su app de GitHub solo ve `alexo123456780` y `Koonext`, no `TOKYOMAN-ORG`, así que no puede enlazarse al repo para desplegar con cada push. El conector solo permite subir archivos como base64 dentro de la llamada, lo cual no es práctico para un `dist` de ~400 KB.
2. **No hay dónde correr la API ni PostgreSQL.** No hay CLI ni token de Render, Railway o Fly, y el equipo de Vercel no tiene integraciones de bases de datos (403 al listarlas).

## Pendiente (acciones del equipo)

1. **Revisar el CI** en la pestaña *Actions* de GitHub para `develop`. Si algo falla, el cambio es mío.
2. **Desbloquear Vercel**, con la opción que convenga:
   - *(la más corta)* crear un repositorio vacío en la cuenta personal de GitHub vinculada a Vercel (`alexo123456780`). Se le añade como segundo remoto, y Vercel y Render lo ven sin permisos extra;
   - o instalar la app de Vercel en `TOKYOMAN-ORG` (requiere ser owner de la org);
   - o crear un token de Vercel y guardar los tres secretos del job `deploy-web`.
3. **Crear la API en Render**: *New → Blueprint* sobre el repo, rellenar `DEMO_EMAIL`, `DEMO_PASSWORD` y `CORS_ORIGIN`. Cuando exista, hay que añadir a `vercel.json` la reescritura `/api/:path*` → `https://<servicio>.onrender.com/api/:path*`. Así la web y la API comparten origen: no hace falta CORS, la CSP sigue en `'self'` y el Service Worker intercepta `/api/v1/reports` igual que en local.
4. **Con la URL pública**: repetir Lighthouse (11 y actual), el E2E completo (`BASE_URL=https://…`), PWABuilder y securityheaders.com, y las pruebas en Android e iPhone.
5. **Fusionar `develop` en `master`** (fast-forward) cuando el CI esté en verde, para que el despliegue salga de la rama por defecto.

## Notas

- El plan gratuito de Render duerme la API tras 15 min sin tráfico (la primera petición tarda ~1 min) y su PostgreSQL gratuito caduca a los 30 días. Para la defensa conviene despertarla antes. El sincronizador lo tolera: una petición lenta o fallida cuenta como fallo transitorio y se reintenta.
- Se eligió Render por su Blueprint (un clic desde el repo); la imagen Docker de la API corre igual en Railway o Fly.
