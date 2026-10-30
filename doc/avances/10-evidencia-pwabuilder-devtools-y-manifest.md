# Avance 10 · Evidencia de PWABuilder y DevTools, y arreglos del manifest

Fecha: 2026-10-30 · Cronograma PRD: S2 · D4 (auditoría) · Plan de auditoría del PRD, sección 12

Todo sobre producción: https://pwa-web-dun.vercel.app

## Evidencia (en `doc/evidencias/`)

| Herramienta | Resultado | Archivo |
| --- | --- | --- |
| DevTools → Application → **Manifest** | "Errors and warnings" vacío; nombre, `start_url /`, `standalone`, `portrait`, colores, íconos 64/192/512/maskable y 3 capturas (2 narrow, 1 wide) | `application-1-manifest.png`, `application-1b-manifest-capturas.png` |
| DevTools → Application → **Service workers** | `#2 activated and is running`, con Push, **Sync** y Periodic sync disponibles | `application-2-service-workers.png` |
| DevTools → Application → **Cache storage** | `workbox-precache-v2-…`, 14 entradas (shell, íconos, `offline.html`, `offline.css`, manifest); sin las capturas del manifest | `application-3-cache-storage.png` |
| DevTools → Application → **IndexedDB** | base `fieldreport`, versión 20 (Dexie v2), 2 object stores (`reports`, `meta`) | `application-4-indexeddb.png` |
| **PWABuilder** | **0 errores, 0 avisos**, 6 informativos, 13 sugerencias; manifest **27/46** "ready for packaging"; *Has Service Worker*, *Has Logic* y *Offline Support* en verde | `pwabuilder.png` |
| Lighthouse 11.7.1 · PWA | **100 %** | `vercel-lighthouse11-pwa.report.html` |
| Lighthouse 13.6.0 · móvil | Rendimiento 95 · Accesibilidad 100 · Buenas prácticas 100 · SEO 100; FCP 0,8 s, LCP 1,9 s, TBT 30–200 ms según la corrida, CLS 0,068 | `vercel-lighthouse-latest-mobile.report.html` |
| Playwright contra producción | 10 de 10 de las pruebas aplicables (1 omitida: es solo de nginx) | — |
| CI (GitHub Actions) | verde en `master` y `develop` en cada commit de este avance | — |
| **Observatorio de Mozilla** (en lugar de securityheaders.com) | **A+ (120/100), 12 de 12 pruebas** | https://developer.mozilla.org/en-US/observatory/analyze?host=pwa-web-dun.vercel.app |

## Qué se cambió

1. **Capturas y categorías en el manifest** (`vite.config.ts`). DevTools avisaba "Richer PWA install UI won't be available… add at least one screenshot" (para escritorio y móvil) y PWABuilder daba 1 aviso por lo mismo. Se agregaron 3 capturas de la app real (`apps/web/public/screenshots/`: listado y formulario en móvil 390×844, listado en escritorio 1280×720, mostrando reportes sin conexión y pendientes de sincronizar) y `categories`. Se excluyen del precaché del Service Worker (`globIgnores`): solo las usa el diálogo de instalación, con red. La prueba del manifest ahora exige capturas `narrow` y `wide` y que respondan `image/png`. Con esto el PRD se cumple en su punto "Instalable sin advertencias".
2. **Se quitó el fallback a `index.html` en Vercel** (`vercel.json`). Ver el hallazgo siguiente.

## Hallazgo: un soft 404 rompió la detección del Service Worker

En el avance 09 se agregó a `vercel.json` una reescritura "todo lo desconocido → `index.html`", solo para que una prueba pensada para nginx pasara también en Vercel. Efecto: cualquier ruta inexistente (`/service-worker.js`, `/no-existe.js`…) respondía **200 con HTML** en lugar de 404. Con esa reescritura puesta, **PWABuilder dejó de detectar el Service Worker en 3 corridas seguidas** ("did not find a Service Worker"), aunque el SW estaba activo (DevTools, Lighthouse y las pruebas E2E lo confirmaban). Al quitar la reescritura, una ruta inexistente vuelve a dar 404 y PWABuilder lo detecta de nuevo.

Lo que quedó: la app usa rutas con hash, así que no necesita ese fallback. nginx lo conserva (`try_files`) y su prueba solo corre con `SPA_FALLBACK=1` (el CI y el README ya lo pasan); sin esa variable se comprueba lo contrario, que una ruta inexistente da 404.

## Cómo se tomaron las capturas de DevTools

Las capturas son del DevTools real, no una maqueta. En este entorno sin interfaz gráfica se lanzó Chromium con `--remote-debugging-port` y se abrió el frontend de DevTools que ese puerto anuncia. Hubo que desactivar, **solo en ese Chromium desechable**, la protección de red local de Chrome (`--disable-features=LocalNetworkAccessChecks,…`), que bloqueaba la conexión del frontend público de DevTools a `127.0.0.1`, y ocultar la vista previa de la página para que *Application* ocupe todo el ancho. Es reproducible, pero también basta abrir DevTools → *Application* en Chrome para repetir cualquiera de las capturas en un minuto.

## Límites

- **securityheaders.com** bloquea clientes automáticos con un desafío anti-bots de Cloudflare, incluso con un navegador real. El Observatorio de Mozilla mide lo mismo (CSP, HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`…), pero no es la herramienta que nombra el PRD. Abrir https://securityheaders.com/?q=https%3A%2F%2Fpwa-web-dun.vercel.app&followRedirects=on a mano y guardar la captura toma 30 segundos.
- **TBT varió de 30 a 200 ms** entre corridas de Lighthouse (throttling simulado): el límite del PRD (≤ 200 ms) se cumple, pero con poco margen en la peor corrida. El rendimiento osciló entre 95 y 97.
- Las capturas de DevTools se tomaron con el fallback a `index.html` aún activo; no afecta al contenido de los paneles (manifest, SW, cachés), pero PWABuilder y Lighthouse sí se repitieron con el despliegue final.
- Siguen sin verificarse en producción las 6 pruebas que requieren la contraseña demo (login real, CRUD offline, sincronización, Background Sync y el flujo con CSP), la instalación en Android e iPhone y el comportamiento tras el arranque en frío de Render.

## Pendiente

1. Las 6 pruebas con la contraseña demo (comando en el avance 09).
2. Captura manual de securityheaders.com, si el profesor exige esa herramienta en concreto.
3. Instalar y probar en un Android (Chrome) y un iPhone (Safari).
4. Fotos y firma (RF-03, RF-04), opcionales.
