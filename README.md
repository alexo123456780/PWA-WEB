# FieldReport PWA

PWA para que técnicos en campo levanten reportes de servicio **sin internet**, desde cualquier smartphone (iOS o Android), y se sincronicen solos al recuperar señal. Proyecto Integrador: *Fundamentos y escenarios de uso de las aplicaciones web progresivas*.

- Requerimientos y decisiones: [`doc/PRD – FieldReport PWA (Proyecto Integrador).md`](doc/PRD%20–%20FieldReport%20PWA%20(Proyecto%20Integrador).md)
- Bitácora de avances (qué se hizo, evidencia y límites): [`doc/avances/`](doc/avances/)
- Evidencia de auditoría Lighthouse: [`doc/evidencias/`](doc/evidencias/)

## Arranque rápido

Requiere Docker y Docker Compose.

```bash
cp .env.example .env
docker compose up --build        # web http://localhost:5173 · API http://localhost:3000/api/docs
```

Usuario demo (del `.env`): `tecnico@fieldreport.test` / `demo1234`.

Si tu usuario del sistema no es el 1000 (`id -u`), define `HOST_UID` y `HOST_GID` en `.env` para que los archivos que escribe el contenedor no queden como `root`. Tras cambiar dependencias usa `docker compose up --build -V` (renueva el volumen de `node_modules`).

### Probar en un celular real (HTTPS)

Las PWA exigen HTTPS fuera de `localhost`. Con un token de [Ngrok](https://ngrok.com) en `NGROK_AUTHTOKEN`:

```bash
docker compose --profile tunnel up
# la URL pública sale en http://localhost:4040
```

La web y la API comparten origen (Vite en desarrollo y nginx en producción hacen proxy de `/api`), así que el celular solo necesita llegar al túnel de la web.

### Producción local

```bash
docker compose -f docker-compose.prod.yml up --build -d    # http://localhost:8080
```

Es lo que hay que auditar: el servidor de desarrollo no refleja el precaché real.

## Estructura

```
apps/api         NestJS 12 + Prisma 7 + PostgreSQL (REST /api/v1, Swagger en /api/docs)
apps/web         React 19 + Vite 8 + Tailwind 4, Service Worker propio (src/sw.ts), Dexie
packages/shared  Esquemas Zod y tipos compartidos por la web y la API
doc/             PRD, documento del proyecto, avances y evidencias
```

## Pruebas

```bash
npm install && npm run build:shared
npm test -w @fieldreport/web                 # unitarias (Vitest + fake-indexeddb)
docker compose up -d --wait api
docker compose exec -T api npm test          # API contra PostgreSQL real
```

E2E (Chromium real: instalabilidad, offline, sincronización, Background Sync, cabeceras). Se corre contra el contenedor de producción; la imagen oficial de Playwright evita instalar librerías de sistema:

```bash
docker compose -f docker-compose.prod.yml up -d --build --wait
docker run --rm --network host --ipc=host -v "$PWD":/work -w /work/apps/web \
  --user "$(id -u):$(id -g)" -e HOME=/tmp -e BASE_URL=http://localhost:8080 \
  mcr.microsoft.com/playwright:v1.64.1-noble npx playwright test
```

Con Chromium instalado en el sistema basta `BASE_URL=http://localhost:8080 npx playwright test` dentro de `apps/web`.

## Auditoría

Lighthouse 12+ eliminó la categoría "Progressive Web App"; el criterio del PRD se cubre con Lighthouse 11, el panel *Application* de DevTools y las pruebas de instalabilidad de Chrome:

```bash
npx lighthouse@11 http://localhost:8080 --only-categories=pwa --view     # PWA
npx lighthouse@latest http://localhost:8080 --view                       # rendimiento, accesibilidad, etc.
```

## Despliegue

Detalle y estado en [`doc/avances/07-despliegue-y-cicd.md`](doc/avances/07-despliegue-y-cicd.md).

- **Web** (Vercel): `vercel.json` ya trae los comandos y las cabeceras (CSP, caché del SW, manifest). El job `deploy-web` de `.github/workflows/ci.yml` despliega desde `master` cuando existen los secretos `VERCEL_TOKEN`, `VERCEL_ORG_ID` y `VERCEL_PROJECT_ID`; también se puede enlazar el repo desde Vercel.
- **API + PostgreSQL** (Render): *New → Blueprint* sobre este repo (`render.yaml`). Pide `DEMO_EMAIL`, `DEMO_PASSWORD` y `CORS_ORIGIN`; `JWT_SECRET` lo genera Render. La imagen `prod` de `apps/api/Dockerfile` también corre en Railway o Fly.
- La web llama a la API en el mismo origen (`/api/v1`). En Vercel eso se logra con una reescritura en `vercel.json` hacia la URL de Render (`/api/:path*`); sin ella, o si prefieres otro origen, compila con `VITE_API_URL=https://<api>/api/v1`, incluye ese origen en `CORS_ORIGIN` y en `connect-src` de la CSP.

## Limitaciones conocidas

- Fotos y firma (RF-03, RF-04) no están implementadas.
- Background Sync solo existe en Chromium; en Safari/iOS se sincroniza al abrir la app, con `online` y con el botón "Sincronizar ahora".
- Un solo usuario demo; un dispositivo = un técnico.
- La prueba de instalación en Android e iOS reales sigue pendiente.
