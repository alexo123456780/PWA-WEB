# Avance 04 · Login y reportes offline sobre IndexedDB

Fecha: 2026-10-29 · Cronograma PRD: S2 · D3 (primera parte) · Cubre RF-01, RF-02, RF-05, RF-08 (parcial), RF-09, RF-10, RNF-03, RNF-08/09 (parcial), RNF-12

## Qué se hizo

La UI lee y escribe **solo en IndexedDB** (Dexie); nada espera al servidor. La sincronización con la API llega en el avance 05.

- **`src/db.ts`**: base `fieldreport` con la tabla `reports` (clave `clientId`, índices `syncState` y `createdAtClient`). Cada reporte guarda `syncState` (`pending`, `syncing`, `synced`, `error`), `retryCount`, `nextRetryAt`, `lastError` y `serverId`.
- **`src/reports.ts`**: `createReport` (genera el `clientId` con `crypto.randomUUID()` y la hora real de captura), `updateReport` y `deleteReport`. Solo se edita o elimina lo que **no** está `syncing` ni `synced`; la comprobación y el cambio van en una transacción, para que no se cuele una edición mientras el sincronizador toma el reporte.
- **Login** (`/auth/login` de la API): el token JWT vive en `localStorage` (en el avance 05 pasó a IndexedDB para que lo use el Service Worker). Sin token se ve la pantalla de login, que pide conexión. Con token la app funciona entera sin red. "Salir" borra el token **y** el caché `api-reports-v1` del Service Worker (RNF-06).
- **Pantallas** con rutas por hash (`#/`, `#/new`, `#/r/:id`, `#/r/:id/edit`): funcionan igual offline y no necesitan configuración en el servidor.
  - *Listado*: más recientes primero, insignia de estado de sincronización en cada uno y un aviso permanente "N reportes sin sincronizar" (en iOS el sistema puede borrar datos de apps poco usadas).
  - *Formulario* (React Hook Form + el esquema Zod de `@fieldreport/shared`, el mismo que valida la API): cliente, tipo de servicio, estatus, descripción y ubicación opcional con "Usar mi ubicación" o captura manual de latitud/longitud (RF-02).
  - *Detalle*: editar y eliminar solo si está pendiente o con error; eliminar pide confirmación.
- **Almacenamiento (RNF-12)**: al abrir la app se llama `navigator.storage.persist()`; si guardar falla con `QuotaExceededError`, el formulario muestra un mensaje claro en vez de perder el reporte en silencio.
- Textos de validación claros en `@fieldreport/shared` ("Escribe el nombre del cliente", "Describe el trabajo realizado (mínimo 5 caracteres)"); los demás salen en español con `z.locales.es()`.

## Evidencia

| Capa | Resultado |
| --- | --- |
| Unitarias (Vitest + `fake-indexeddb`) | **5 de 5**: guardar como pendiente con `clientId` único; editar devuelve a pendiente y borra `lastError`/`nextRetryAt`; no editar ni eliminar `syncing`/`synced`; eliminar pendiente |
| API e2e (en Docker) | **6 de 6**, sin regresiones tras refactorizar el esquema compartido |
| Playwright contra el contenedor nginx de producción | **9 de 9** (6 del avance 03 + 3 nuevas) |

Las 3 pruebas nuevas, en Chromium real:

1. **Credenciales inválidas** → "Correo o contraseña incorrectos".
2. **Validación**: guardar el formulario vacío muestra los dos mensajes y no navega.
3. **Flujo offline completo**: iniciar sesión con red → `setOffline(true)` → crear **2** reportes → el listado muestra "2 reportes sin sincronizar" → **recargar la página sin red** y los 2 siguen ahí → editar uno → eliminar el otro.

Además se revisaron capturas en un viewport de 390 px (`apps/web/test-results/shots/`, no versionado).

## Problemas encontrados y arreglados

- **Bug de usabilidad detectado por el E2E**: el aviso "Lista para usarse sin conexión" y el botón fijo "Nuevo reporte" ocupaban la misma posición, y el aviso **bloqueaba los toques** del botón. Ahora el aviso va encima del botón y desaparece solo a los 5 s.
- **Archivos de `root` en el repo**: los contenedores de desarrollo con bind mount creaban `apps/web/node_modules/.vite`, `apps/api/dist` y `tsbuildinfo` como `root`, y rompieron `npm install` en el host. Los servicios `api` y `web` de dev ahora corren con tu UID (`user: "${HOST_UID:-1000}:${HOST_GID:-1000}"`, `HOME=/tmp`). Si tu usuario no es el 1000, define `HOST_UID`/`HOST_GID` en `.env`.
- Los mensajes de Zod por defecto sonaban a máquina; se reemplazaron.

## Decisiones y desviaciones del PRD

- **Sin TanStack Query.** El PRD lo propone junto a Dexie; aquí `useLiveQuery` (dexie-react-hooks) cubre las lecturas reactivas y la sincronización va escrita a mano. Una dependencia menos y menos código que defender.
- **Rutas con hash** en vez de `react-router`: 15 líneas, sin dependencia, sin depender del fallback del servidor.
- **Editar/eliminar solo lo no enviado.** Los reportes `synced` son de solo lectura en el cliente. Limitación conocida: un reporte en `error` pudo haber llegado al servidor sin que el cliente se enterara (respuesta perdida); si el técnico lo elimina localmente, el del servidor queda. Es un caso raro que el prototipo acepta.
- **Un solo usuario por dispositivo.** Los reportes locales no guardan el dueño; si otra persona inicia sesión en el mismo teléfono, se sincronizarían bajo su cuenta. Fuera de alcance del MVP (roles/multiusuario).
- **Fotos (RF-03) y firma (RF-04) siguen pendientes**: son Should/Could y se atacan al cerrar los Must.

## No verificado

- Captura de ubicación real (`navigator.geolocation`): el botón y el fallback manual existen, pero no se probó en un dispositivo con GPS.
- `QuotaExceededError`: el camino de código existe, pero no se simuló una cuota llena.
- Accesibilidad (RNF-08): hay etiquetas en todos los campos, objetivos táctiles ≥ 44 px y contraste AA según la paleta elegida, pero falta medirlo con Lighthouse (avance de auditoría).

## Pendiente / siguiente

- Avance 05: sincronizador a mano (cola, backoff exponencial 2 s → 5 min, 5 fallos → `error`), disparadores `online`/apertura/botón manual/Background Sync, manejo de 401 (sesión expirada), caché del SW al cerrar sesión ya resuelta aquí.
