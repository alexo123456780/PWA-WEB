# Avance 08 · Web desplegada en Vercel (HTTPS público)

Fecha: 2026-10-29 · Cronograma PRD: S2 · D5 (parcial) · Entregable final: despliegue en producción con HTTPS nativo

**URL de producción: https://pwa-web-dun.vercel.app**

## Qué se hizo

- **Repositorio público** `alexo123456780/PWA-WEB` (segundo remoto `personal`), con `master` y `develop` en el mismo commit que `TOKYOMAN-ORG/PROYECTO_WEB`. Antes de publicarlo se revisaron los archivos versionados: no hay secretos, solo los valores de desarrollo de `.env.example`.
- **CI en GitHub Actions: en verde** en `master` y en `develop` (jobs `checks` y `e2e`: 16 unitarias, 6 de la API contra PostgreSQL y 15 E2E con Chromium en un runner limpio).
- **Vercel**: proyecto `pwa-web` enlazado al repo (raíz `./`, preset *Other*; los comandos, la salida `apps/web/dist` y las cabeceras salen de `vercel.json`). Despliega solo con cada push a `master`; las demás ramas generan previews. Primer despliegue de producción: commit `925f7ea` (el que pasó el CI), estado `READY`, 21 s.
- Se descartó el job de despliegue por secretos que se había preparado en el avance 07: la integración Git de Vercel lo hace y mantener dos vías era redundante.

## Evidencia sobre la URL pública

| Prueba | Resultado |
| --- | --- |
| Lighthouse 11.7.1 · categoría PWA | **100 %** |
| Lighthouse 13.6.0 · móvil | **Rendimiento 97 · Accesibilidad 100 · Buenas prácticas 100 · SEO 100** |
| Métricas | FCP 0,8 s · LCP 1,8 s (meta ≤ 2,5) · TBT 110 ms (meta ≤ 200) · CLS 0,068 |
| Playwright (Chromium, HTTPS real) | **7 de 9**: instalable, manifest, abre sin conexión, `/offline.html` sin red, cabeceras de caché, cabeceras de seguridad, `offline.html` con estilos |
| Cabeceras (curl) | CSP, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy` presentes; `sw.js`, `manifest.webmanifest` y `offline.html` con `no-cache`; `/assets/*` con `immutable`; manifest como `application/manifest+json` |
| Acceso | El alias de producción responde 200 sin pedir iniciar sesión en Vercel |

Los 2 que **fallan son esperados** y no son un defecto: necesitan la API, que todavía no existe (uno consulta `/api/v1/health`, que en Vercel da 404 sin la reescritura; el otro inicia sesión). Los reportes HTML están en `doc/evidencias/vercel-*.html`.

## Diferencias con la ejecución local

- `/` y `index.html` salen con `Cache-Control: public, max-age=0, must-revalidate` (regla propia de Vercel para la raíz) en vez de `no-cache`: en la práctica es equivalente, el navegador revalida siempre.
- CLS 0,068 frente a 0,006 en local; sigue por debajo del umbral "bueno" (0,1).

## No verificado

- **Login y sincronización en producción**: dependen de la API (Render) y de la reescritura `/api/*` en `vercel.json`.
- **securityheaders.com** bloquea clientes automáticos (403); falta sacar la nota abriendo https://securityheaders.com/?q=https%3A%2F%2Fpwa-web-dun.vercel.app&followRedirects=on
- **PWABuilder** es una aplicación web que no se puede automatizar aquí; hay que abrir https://www.pwabuilder.com/reportcard?site=https://pwa-web-dun.vercel.app y guardar la captura.
- **Instalación real** en Android (Chrome) y iPhone (Safari) con esta URL.
- No se revisó la protección de las URLs de previews y de despliegues individuales de Vercel (el proyecto tiene *Vercel Authentication* activa); solo se comprobó el alias de producción.

## Pendiente / siguiente

1. **API en Render**: *New → Blueprint* sobre `alexo123456780/PWA-WEB` (`render.yaml`), con `DEMO_EMAIL`, `DEMO_PASSWORD` (distinta de `demo1234`, que es pública en el repo) y `CORS_ORIGIN=https://pwa-web-dun.vercel.app`.
2. Con la URL de Render: añadir a `vercel.json` la reescritura `/api/:path*` → `https://<servicio>.onrender.com/api/:path*`, esperar el redespliegue y correr el E2E completo (login, offline, sincronización) contra `https://pwa-web-dun.vercel.app`.
3. PWABuilder, securityheaders.com y capturas del panel *Application*.
4. Pruebas en Android e iPhone reales; después, fotos y firma (RF-03, RF-04) si queda tiempo.
