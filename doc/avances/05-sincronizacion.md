# Avance 05 · Sincronización: cola, backoff, Background Sync

Fecha: 2026-10-29 · Cronograma PRD: S2 · D3 (segunda parte) · Cubre RF-06, RF-07, RF-08, RF-12 (cliente), RNF-03, RNF-06

## Qué se hizo

- **`src/sync.ts`** — el sincronizador, escrito a mano. Se ejecuta igual en la ventana y en el Service Worker (no usa nada propio de `window`).
  - Toma los reportes `pending` **en orden de captura**, cuyo `nextRetryAt` ya venció, y los marca `syncing`.
  - `POST /reports` con el `clientId`; si funciona → `synced` + `serverId`.
  - **Backoff exponencial**: 2 s, 4 s, 8 s, 16 s… con tope de 5 min (`backoffMs`). Al 5.º fallo → `error` (visible, con el mensaje) y ya no se reintenta solo.
  - **Fallo transitorio** (sin respuesta de red, 5xx, 408, 429) → cuenta como intento y se reprograma. **4xx permanente** (p. ej. 400 por datos inválidos) → `error` de inmediato: reintentar fallaría igual.
  - **401**: se detiene el envío, los reportes vuelven a `pending` **sin contar intento** (no es culpa del reporte), se borra el token y se marca la sesión como expirada. El login muestra "Tu sesión expiró… los que tienes guardados no se pierden".
  - **Un solo sincronizador a la vez** entre pestañas y Service Worker, con Web Locks (`navigator.locks`). Con el candado en la mano, cualquier reporte que siga en `syncing` quedó huérfano (app cerrada a mitad de envío) y vuelve a la cola; el servidor es idempotente, así que reenviarlo no duplica.
- **`src/autosync.ts`** — disparadores en la ventana: al abrir la app, al volver a primer plano, evento `online` y un barrido cada 5 s mientras la app está visible (respeta el backoff de cada reporte). `requestSync()` se llama tras guardar: sincroniza ya y registra un Background Sync.
- **Background Sync** (`src/sw.ts`): el evento `sync` con la etiqueta `sync-reports` ejecuta `syncNow()` dentro del Service Worker, **con la app cerrada**.
- **Token en IndexedDB** (`src/session.ts`, tabla `meta`, esquema Dexie v2) en lugar de `localStorage`, porque el Service Worker no puede leer `localStorage`. La UI lo lee con `useLiveQuery` (`src/useSession.ts`), así que reacciona sola cuando el SW o el sincronizador expiran la sesión.
- **UI**: botón "Sincronizar ahora" en el listado (adelanta reintentos programados y reintenta los `error`) y "Reintentar ahora" en el detalle de un reporte con error.

## Evidencia

| Capa | Resultado |
| --- | --- |
| Unitarias (Vitest) | **16 de 16** (9 del sincronizador + 5 del repositorio + 2 de reintento manual) |
| Playwright contra nginx de producción | **12 de 12** (9 anteriores + 3 nuevas) |
| API e2e | 6 de 6 (sin cambios) |

Pruebas unitarias del sincronizador: backoff (2/4/8/16 s y tope de 5 min); envío en orden con token y `clientId`; fallo de red → reintento programado y **no se reenvía antes de tiempo**; 5 fallos → `error` y no reintenta solo; 400 → `error` inmediato con el mensaje del servidor; 401 → detiene, no cuenta intento y pide login; huérfano en `syncing` recuperado; sin conexión no envía; candado ocupado no envía.

Pruebas E2E nuevas (Chromium real, contra la API real y verificando el servidor):

1. **Crear 3 reportes sin red → volver la red → los 3 quedan `Sincronizado` en ≤ 10 s**; en el servidor hay exactamente 3, con `clientId` distintos (antes de volver la red había 0). La prueba completa dura ~2 s.
2. **Corte de red a mitad del envío** (el primer `POST` se aborta): reintenta con backoff, el 2.º intento funciona y el servidor tiene **1** reporte, sin duplicar (SW bloqueado en esta prueba para poder interceptar la red).
3. **Background Sync con la app cerrada**: se crea un reporte sin red, se **cierra la página**, vuelve la red y se despacha el evento `sync` por CDP (equivale al botón "Sync" de DevTools). El reporte llega al servidor sin que exista ninguna ventana de la app.
   - Control negativo: la misma secuencia **sin** despachar el evento no sincroniza nada en 6 s, así que es el SW quien lo envía.

Las pruebas E2E se limpian solas: la BD quedó sin reportes `E2E-*`.

## Decisiones y desviaciones del PRD

- **El límite de 5 min del backoff no se alcanza** con 5 intentos (la espera máxima real es 16 s; el total, 30 s). La fórmula y el tope siguen el PRD y quedan listos si se sube `MAX_RETRIES`. Consecuencia práctica: con señal muy mala por más de ~30 s un reporte pasa a `error` y pide reintento manual. Es lo que pide el PRD (sección 10); si en las pruebas de campo resulta agresivo, el ajuste es una constante.
- **El barrido de 5 s** es más simple que programar un temporizador exacto por reporte y cuesta una consulta indexada; se pausa con la app oculta.
- **Los `error` no se reintentan automáticamente**, ni siquiera con el evento `online`; solo con "Sincronizar ahora" o "Reintentar ahora".
- **Token en IndexedDB**: tiene la misma exposición ante XSS que `localStorage` (cualquiera de los dos es legible por JS de la página). La mitigación real es la CSP, pendiente en el avance de auditoría.

## Limitaciones conocidas / no verificado

- **Background Sync solo existe en Chromium**. En Safari/iOS no se ejecuta; ahí se sincroniza al abrir la app, al volver a primer plano, con `online` y con el botón (diseñado así desde el PRD). No se probó en iOS.
- No se verificó que el navegador **reintente por su cuenta** un `sync` fallido ni el comportamiento con `lastChance: true`.
- La prueba de Background Sync despacha el evento manualmente; que Chrome lo dispare solo al recuperar red real (no emulada) debe confirmarse en un Android físico.
- `navigator.locks` no tiene plan B para navegadores sin Web Locks (Safari 15.4+ y Chromium/Firefox recientes lo tienen; el PRD fija Safari 16.4+).
- Fotos (RF-03) y firma (RF-04) siguen pendientes; el `POST /reports/:id/photos` tampoco existe todavía.

## Pendiente / siguiente

- Avance 06: cabeceras de seguridad (CSP, HSTS, X-Content-Type-Options, RNF-04), auditoría (Lighthouse, Application, PWABuilder), README con comandos, CI de GitHub Actions y configuración de despliegue (Vercel/Netlify + API).
- Después: fotos comprimidas en cliente y firma, si queda tiempo (Should/Could).
