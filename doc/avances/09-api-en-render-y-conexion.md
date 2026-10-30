# Avance 09 · API en Render y conexión con la web

Fecha: 2026-10-30 · Cronograma PRD: S2 · D5 · Entregable final: despliegue en producción

- **Web:** https://pwa-web-dun.vercel.app
- **API:** https://fieldreport-api.onrender.com (Swagger en `/api/docs`)

## Qué se hizo

- **Render** creó, a partir de `render.yaml` (Blueprint `fieldreport`, rama `master`), la base de datos `fieldreport-db` (PostgreSQL) y el servicio `fieldreport-api` (imagen `prod` de `apps/api/Dockerfile`). Las variables `DEMO_EMAIL`, `DEMO_PASSWORD` y `CORS_ORIGIN` se llenaron en el panel (no están en el repo) y `JWT_SECRET` lo generó Render.
- **Conexión**: `vercel.json` reenvía `/api/*` de la web a la API de Render. Web y API comparten origen, así que no hay CORS, la CSP sigue en `'self'` y el Service Worker intercepta `/api/v1/reports` igual que en local. Además, las rutas desconocidas caen en `index.html` (mismo comportamiento que `try_files` de nginx).
- Cada push a `master` redespliega la web (Vercel) y la API (Render, `autoDeployTrigger: commit`).

## Evidencia

| Comprobación | Resultado |
| --- | --- |
| `GET https://fieldreport-api.onrender.com/api/v1/health` | 200 `{"status":"ok"}` (hace `SELECT 1`, así que la base de datos responde) |
| `POST /api/v1/auth/login` con credenciales falsas | 401 `Credenciales inválidas` (no 500: llega a la BD y la consulta) |
| `GET /api/v1/reports` sin token | 401 |
| `GET /api/docs` | 200 |
| Login con la contraseña de `.env.example` (`demo1234`) | 401: producción usa otra contraseña |
| `GET https://pwa-web-dun.vercel.app/api/v1/health` (reescritura) | 200 `{"status":"ok"}` |
| Playwright contra `https://pwa-web-dun.vercel.app` | **9 de 9** de las pruebas que no necesitan la contraseña: instalabilidad, manifest, abrir sin conexión, `/offline.html`, cabeceras de caché y seguridad, `offline.html` con estilos, **proxy `/api` hasta la API real**, rechazo de credenciales falsas de punta a punta |

## No verificado

- **Login real, CRUD offline, sincronización y Background Sync contra producción** (6 pruebas): necesitan la contraseña demo de producción, que solo tiene el equipo. Para correrlas:

  ```bash
  docker run --rm --network host --ipc=host -v "$PWD":/work -w /work/apps/web \
    --user "$(id -u):$(id -g)" -e HOME=/tmp \
    -e BASE_URL=https://pwa-web-dun.vercel.app \
    -e DEMO_EMAIL=<correo> -e DEMO_PASSWORD=<contraseña> \
    mcr.microsoft.com/playwright:v1.64.1-noble npx playwright test
  ```

  Las de sincronización crean reportes `E2E-…` en la base de producción y los borran al terminar.
- **Arranque en frío**: el plan gratuito de Render duerme la API tras 15 min sin tráfico y despertarla tarda cerca de 1 min. No se comprobó cómo responde la reescritura de Vercel durante ese minuto: el primer inicio de sesión podría fallar y bastaría reintentar. El sincronizador sí lo tolera (un fallo de red es transitorio y se reintenta con backoff). Antes de la defensa conviene abrir `/api/v1/health` para despertarla.
- Instalación en Android e iPhone reales, PWABuilder y securityheaders.com (ver avance 08).

## Riesgos y fechas

- **La base de datos gratuita de Render caduca a los 30 días**, es decir, hacia el **29 de noviembre de 2026**. Si la evaluación es después, hay que recrearla o pasar a un plan de pago.
- El plan gratuito del servicio web limita a ~750 horas al mes: alcanza para un servicio encendido todo el mes, pero no para dos.
- La contraseña demo de desarrollo (`demo1234`) es pública en el repositorio; producción usa una distinta.

## Pendiente

1. Correr las 6 pruebas restantes con la contraseña demo (comando de arriba).
2. PWABuilder, securityheaders.com y capturas del panel *Application* (manuales).
3. Instalar y probar en un Android (Chrome) y un iPhone (Safari) con la URL de producción.
4. Opcional: evitar el arranque en frío con un ping programado a `/api/v1/health`; y fotos y firma (RF-03, RF-04).
