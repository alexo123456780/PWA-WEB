# PRD – FieldReport PWA (Proyecto Integrador)

Oct 29, 2026 · @Alejandro Magaña Lopez

## 1. Resumen ejecutivo

FieldReport es una PWA para que técnicos en campo levanten reportes de servicio sin internet, desde cualquier smartphone (iOS o Android), y los sincronicen solos al recuperar señal.

**Problema.** Los técnicos trabajan en zonas rurales sin cobertura. Hoy anotan en papel o en apps que se cierran sin red, y los reportes se pierden, se capturan dos veces o llegan tarde a la oficina.

**Solución.** Una Aplicación Web Progresiva instalable, con Service Worker, caché y base local (IndexedDB) que guarda reportes offline y los envía a una API REST cuando vuelve la conexión.

**Objetivos del proyecto**

- Justificar con una matriz de decisión por qué una PWA gana frente a web tradicional, app orientada a servicios (API), nativa y multiplataforma.
- Entregar un prototipo funcional, instalable y 100% operativo en modo avión para crear, ver y editar reportes.
- Lograr 100% en la auditoría PWA (Lighthouse 11 y panel Application de DevTools; la categoría PWA ya no existe en Lighthouse 12+, ver sección 12) y desplegar con HTTPS nativo.
- Dejar todo contenerizado con Docker para que cualquier compañero lo levante con un solo comando.

**Métricas de éxito**

| Métrica | Meta | Cómo se mide |
| --- | --- | --- |
| Auditoría PWA / Installable | Todos los checks en verde (100%) | Lighthouse 11, DevTools Application y PWABuilder |
| Reportes creados offline sin pérdida | 100% en 20 pruebas manuales | Modo avión en DevTools y en dispositivo real |
| Sincronización automática | ≤ 10 s tras recuperar red | Cronómetro en pruebas, log del Service Worker |
| Instalación real | Chrome Android y Safari iOS | Prueba en 2 dispositivos físicos |
| Lighthouse Performance móvil | ≥ 90 | Lighthouse con throttling móvil |
| Levantar el entorno local | 1 comando (`docker compose up`) | Prueba en máquina limpia |

## 2. Usuarios y casos de uso

Hay tres perfiles; el técnico en campo es el usuario principal y todo el diseño parte de él.

| Perfil | Contexto | Necesidad clave |
| --- | --- | --- |
| Técnico de campo | Zona rural, sin red, celular propio (iOS o Android, gama media/baja), una mano ocupada | Capturar un reporte rápido (< 2 min), con fotos y firma, sin perder nada |
| Supervisor / coordinador | Oficina o remoto, con internet | Ver reportes recién sincronizados, filtrarlos y cambiar su estatus |
| Administrador (opcional, fuera de MVP) | Oficina | Gestionar técnicos y catálogos de servicios |

**Casos de uso principales**

1. **UC-01 Instalar la app.** El técnico abre la URL con Chrome o Safari, acepta el banner de instalación (o "Añadir a pantalla de inicio" en iOS) y abre la app en modo standalone.
2. **UC-02 Levantar un reporte sin red.** El técnico llena el formulario, adjunta fotos y guarda; el reporte queda en IndexedDB con estado "Pendiente de sincronizar".
3. **UC-03 Sincronizar al recuperar red.** La app detecta conexión, envía los pendientes a la API y marca cada uno como "Sincronizado".
4. **UC-04 Consultar reportes.** El técnico ve su historial, incluso offline, con indicador visual de qué está sincronizado y qué no.
5. **UC-05 Editar o cancelar un reporte pendiente** antes de que se sincronice.
6. **UC-06 Recibir aviso de actualización.** Cuando hay nueva versión del Service Worker, la app muestra "Hay una actualización, recargar".

## 3. Alcance, supuestos y restricciones

El MVP cubre el ciclo completo capturar, guardar offline, sincronizar y consultar; todo lo demás queda fuera para llegar a tiempo en dos semanas.

**Dentro del alcance**

- Formulario de reporte técnico (cliente, ubicación, tipo de servicio, descripción, fotos, firma, estatus).
- Instalabilidad (manifest + Service Worker + HTTPS) en Chrome Android y Safari iOS.
- Operación offline completa con cola de sincronización.
- API REST básica con persistencia real en base de datos.
- Auditoría Lighthouse, documentación y despliegue en producción.

**Fuera del alcance (versión futura)**

- Login con roles avanzados y SSO.
- Notificaciones push en iOS (requiere app instalada y tiene limitaciones).
- Panel de analítica, exportación a PDF masiva y multitenencia.
- Resolución de conflictos de edición multiusuario.

**Supuestos**

- El técnico abre la app al menos una vez con internet para que se cachee el App Shell.
- Los dispositivos usan versiones recientes de Chrome (Android) y Safari 16.4+ (iOS).
- Para el prototipo, la autenticación es simple (JWT con usuario demo); el objetivo evaluable es la PWA, no el sistema de usuarios.

**Restricciones**

- Tiempo: 2 semanas, con entregables parciales semanales.
- HTTPS obligatorio (túnel con Ngrok en desarrollo, Vercel o similar en producción).
- Cuota de almacenamiento del navegador, sobre todo en iOS (se detalla en la sección 7).

## 4. Requerimientos funcionales

Diecisiete requerimientos priorizados con MoSCoW: los "Must" son los que la rúbrica evalúa directamente.

| ID | Requerimiento | Prioridad | Rúbrica |
| --- | --- | --- | --- |
| RF-01 | Formulario de reporte con validación en cliente (cliente, tipo de servicio, descripción, fecha/hora, estatus) | Must | Offline |
| RF-02 | Captura de ubicación con Geolocation API (si falla, campo manual) | Should | Offline |
| RF-03 | Adjuntar hasta 3 fotos comprimidas en cliente (≤ 300 KB c/u) | Should | Offline |
| RF-04 | Firma del cliente en canvas | Could | Offline |
| RF-05 | Guardar reportes en IndexedDB cuando no hay red | Must | Offline |
| RF-06 | Cola de sincronización con reintentos y backoff exponencial | Must | Offline |
| RF-07 | Sincronización automática al evento `online` y vía Background Sync donde exista | Must | Offline |
| RF-08 | Indicador visible de estado de red y de cada reporte (Pendiente, Sincronizando, Sincronizado, Error) | Must | Offline |
| RF-09 | Listado y detalle de reportes, disponibles offline | Must | Offline |
| RF-10 | Editar o eliminar un reporte pendiente | Should | Offline |
| RF-11 | API REST: `POST/GET/PUT/DELETE /api/reports` con persistencia en PostgreSQL | Must | Entorno |
| RF-12 | Idempotencia: cada reporte lleva un `clientId` (UUID) para no duplicar al reintentar | Must | Offline |
| RF-13 | Web App Manifest válido, íconos 192×192, 512×512 y maskable, modo `standalone` | Must | Instalabilidad |
| RF-14 | Botón propio "Instalar app" con `beforeinstallprompt` y guía manual para iOS | Must | Instalabilidad |
| RF-15 | Service Worker con eventos install, activate y fetch | Must | Offline |
| RF-16 | Página `/offline.html` de contingencia | Must | Offline |
| RF-17 | Aviso de nueva versión disponible y botón de recargar | Should | Calidad |

## 5. Requerimientos no funcionales

| ID | Categoría | Requerimiento | Meta medible |
| --- | --- | --- | --- |
| RNF-01 | Rendimiento | Carga inicial en 4G lento (throttling Lighthouse) | LCP ≤ 2.5 s, TBT ≤ 200 ms |
| RNF-02 | Rendimiento | Carga repetida desde caché | Shell visible en < 1 s |
| RNF-03 | Offline | Funciones esenciales sin red | 100% de UC-02, UC-04 y UC-05 |
| RNF-04 | Seguridad | HTTPS en todos los entornos; cabeceras CSP, HSTS, X-Content-Type-Options | Sin hallazgos en securityheaders.com (A) |
| RNF-05 | Seguridad | Validación de entradas en servidor (DTOs) y límite de tamaño de body | Rechazo 400/413 con mensaje claro |
| RNF-06 | Seguridad | Sin datos sensibles en caché del SW (no cachear respuestas con token) | Revisión manual en DevTools |
| RNF-07 | Compatibilidad | Chrome Android, Safari iOS 16.4+, Edge y Chrome desktop | Prueba en ≥ 2 navegadores reales |
| RNF-08 | Accesibilidad | Contraste AA, targets táctiles ≥ 44 px, etiquetas en formularios | Lighthouse Accessibility ≥ 90 |
| RNF-09 | Usabilidad | Diseño mobile-first, usable con una mano y con guantes finos | Formulario completo en < 2 min |
| RNF-10 | Mantenibilidad | TypeScript estricto, ESLint, Prettier, commits convencionales | CI en verde |
| RNF-11 | Portabilidad | Todo corre en contenedores | `docker compose up` en máquina limpia |
| RNF-12 | Almacenamiento | Respetar cuotas del navegador y pedir `navigator.storage.persist()` | Manejo de `QuotaExceededError` |

## 6. Análisis arquitectónico y matriz de decisión

La PWA gana con 4.40 de 5 porque es la única opción que combina offline real, un solo código para iOS y Android, cero tienda de apps y despliegue inmediato.

**Las cinco alternativas**

- **App web tradicional:** páginas renderizadas en servidor; sin red no hay nada. Descartada por el requisito offline.
- **App orientada a servicios (API):** backend REST/GraphQL consumido por cualquier cliente. No es un cliente por sí sola: es la capa de datos que la PWA va a consumir (la construimos en la semana 1).
- **App nativa (Swift/Kotlin):** mejor acceso al hardware y offline sólido, pero dos bases de código, tiendas de apps y ciclos de revisión.
- **Multiplataforma (Flutter / React Native):** una base de código y buen offline, pero requiere compilar, publicar en tiendas y actualizar con cada release.
- **PWA:** web instalable con Service Worker; se actualiza al recargar, no pasa por tiendas y corre en cualquier navegador moderno.

**Matriz de decisión** (1 = pobre, 5 = excelente; ponderada por importancia para el escenario)

| Criterio | Peso | Web tradicional | App API | Nativa | Multiplataforma | PWA |
| --- | --- | --- | --- | --- | --- | --- |
| Funciona sin internet | 30% | 1 | 1 | 5 | 5 | 4 |
| Cobertura iOS + Android con un código | 20% | 5 | 5 | 1 | 4 | 5 |
| Costo y tiempo de desarrollo (2 semanas) | 20% | 4 | 3 | 1 | 2 | 5 |
| Distribución y actualización sin tienda | 10% | 5 | 5 | 1 | 1 | 5 |
| Acceso a hardware (cámara, GPS) | 10% | 2 | 1 | 5 | 4 | 3 |
| Instalable en pantalla de inicio | 10% | 1 | 1 | 5 | 5 | 4 |
| **Total ponderado** | 100% | **2.90** | **2.60** | **3.00** | **3.70** | **4.40** |

**Decisión:** PWA como cliente, más una API REST como backend. La nativa y la multiplataforma ganan en acceso a hardware, pero ese no es el cuello de botella: cámara y geolocalización cubren el caso de uso desde el navegador.

**Riesgos aceptados de la PWA:** en iOS el almacenamiento puede ser desalojado tras días sin uso, no hay Background Sync y las notificaciones push exigen app instalada. Se mitigan en la sección 10.

## 7. Compatibilidad e instalabilidad

Chromium (Android, Windows, macOS) soporta todo el stack PWA; WebKit (todo iOS, incluso Chrome en iPhone) soporta lo esencial pero con límites que el diseño debe asumir desde el día uno.

**Tabla de compatibilidad por sistema operativo**

| Capacidad | Android (Chrome / Edge) | iOS / iPadOS (Safari, WebKit) | Desktop (Chrome / Edge) |
| --- | --- | --- | --- |
| Service Worker + Cache API | Sí | Sí | Sí |
| Web App Manifest | Sí, completo | Parcial (usa `apple-touch-icon` y metas `apple-mobile-web-app-*`) | Sí |
| Banner / prompt de instalación (`beforeinstallprompt`) | Sí | No: instalación manual con Compartir → Añadir a pantalla de inicio | Sí |
| IndexedDB | Sí | Sí, con desalojo si el usuario no usa la app por días | Sí |
| Cuota de almacenamiento | Amplia (porcentaje del disco libre) | \~50 MB por origen en Safari; mayor, no publicada, si está instalada (cifras aproximadas) | Amplia |
| `navigator.storage.persist()` | Sí | Limitado | Sí |
| Background Sync | Sí | No soportado | Sí (Chromium) |
| Push notifications | Sí | Sí desde iOS 16.4, solo con la app instalada | Sí |
| Instalación en segundo plano | Sí (WebAPK) | No | Sí |
| Geolocation y cámara | Sí | Sí, con permiso en HTTPS | Sí |

**Qué cambia en el diseño por esto**

- No depender de Background Sync: sincronizar también al abrir la app, al evento `online` y con un botón manual "Sincronizar ahora".
- Pedir almacenamiento persistente y comprimir las fotos en cliente para no tocar la cuota de iOS.
- Mostrar una guía visual de instalación cuando el navegador sea Safari/iOS.
- Advertir en la UI cuántos reportes siguen sin sincronizar, porque en iOS el sistema puede borrar datos locales de apps poco usadas.

**Checklist de criterios de instalación**

- [ ] Servida por HTTPS (o `localhost` en desarrollo)
- [ ] `manifest.webmanifest` válido enlazado con `<link rel="manifest">`
- [ ] Campos `name`, `short_name`, `start_url`, `scope`, `display: standalone`, `theme_color`, `background_color`
- [ ] Íconos 192×192 y 512×512 en PNG, más uno `maskable`
- [ ] Service Worker registrado y activo, con manejador del evento `fetch`
- [ ] Responde 200 offline en `start_url` (página de contingencia)
- [ ] `<meta name="viewport">` y `theme-color` en el HTML
- [ ] Íconos `apple-touch-icon` 180×180 para iOS

Fuentes consultadas (octubre 2026): [MagicBell – PWA iOS limitations](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide), [Monterail – PWA for Apple iOS](https://monterail.com/blog/pwa-for-apple-ios), [Edana – PWA offline](https://edana.ch/en/2026/04/05/can-a-web-app-pwa-really-work-offline-like-a-native-app/), [Abratabia – PWA on iOS](https://abratabia.com/pwa-games/pwa-on-ios.php). Las cuotas de iOS varían por versión: confírmalas en tu iPhone con `navigator.storage.estimate()`.

## 8. Stack tecnológico

El stack es React + Vite + TypeScript en el cliente y NestJS + Prisma + PostgreSQL en el servidor, todo en contenedores; coincide con lo que ya dominas (NestJS, Prisma, TypeScript, PostgreSQL, Docker) y con las herramientas que sugiere el documento del proyecto (Vite, Workbox, Lighthouse, Vercel).

| Capa | Tecnología | Por qué |
| --- | --- | --- |
| Frontend | React 19 + TypeScript + Vite | Arranque y HMR rápidos; Vite está en el stack sugerido; menos fricción con PWA que Next.js |
| PWA | `vite-plugin-pwa` (Workbox, modo `injectManifest`) | Genera manifest y registra el SW; `injectManifest` permite escribir el Service Worker propio y cumplir "programar install, activate y fetch" |
| Estilos | Tailwind CSS | Mobile-first rápido, CSS final pequeño |
| Estado y datos | TanStack Query + Dexie (wrapper de IndexedDB) | Dexie da una API limpia sobre IndexedDB y TanStack Query maneja caché y reintentos |
| Formularios | React Hook Form + Zod | Validación compartida con el backend |
| Backend | NestJS (Node 22 LTS) | Tu stack; DTOs con `class-validator`, módulos limpios, Swagger automático |
| ORM | Prisma | Migraciones y tipos; ya lo usas |
| Base de datos | PostgreSQL 16 | Relacional, soporta `UNIQUE` en `clientId` para idempotencia |
| Autenticación (MVP) | JWT simple con usuario demo | Suficiente para el prototipo |
| Contenedores | Docker + Docker Compose | Entorno reproducible (sección 11) |
| Proxy / servidor estático | Nginx (en la imagen del frontend) | Sirve el build con cabeceras y caché correctas |
| Túnel HTTPS en desarrollo | Ngrok (alternativa: Cloudflare Tunnel o LocalTunnel) | Pruebas en celular real con HTTPS |
| Calidad | ESLint, Prettier, Vitest, Playwright, Husky | Pruebas unitarias y e2e (incluye emular offline) |
| Auditoría | Lighthouse (DevTools y CI con `@lhci/cli`), PWABuilder | Meta: 100% PWA |
| CI/CD | GitHub Actions | Lint, test, build, Lighthouse CI |
| Producción | Frontend en Vercel o Netlify; API + PostgreSQL en Render, Railway o Fly.io | Vercel y Netlify dan HTTPS automático (lo pide el documento); la API en contenedor Docker |

**Decisiones clave**

- **Vite y no Next.js:** una PWA offline-first es una SPA; el SSR de Next no aporta y complica el Service Worker. Si prefieres Next.js, es viable con `@serwist/next`, pero cuesta más configurarlo.
- **Monorepo con npm workspaces** (`apps/web`, `apps/api`, `packages/shared`) para compartir tipos y esquemas Zod.
- **Workbox solo donde ayuda:** estrategias de caché con Workbox y lógica de sincronización escrita a mano, para que puedas explicarla en la defensa.

## 9. Arquitectura, modelo de datos y API

La arquitectura es offline-first: la UI siempre lee y escribe en IndexedDB, y un sincronizador aparte conversa con la API cuando hay red. La app nunca espera al servidor para guardar.

**Capas del cliente**

1. **UI (React):** formulario, listado, indicadores de red y de estado.
2. **Repositorio local (Dexie / IndexedDB):** fuente de verdad del cliente; guarda reportes, fotos (Blob) y la cola de sincronización.
3. **Sincronizador:** toma los reportes `pending`, los envía a la API en orden, marca `synced` o `error` y reintenta con backoff.
4. **Service Worker:** precaché del App Shell, estrategias de caché para peticiones y, donde exista, Background Sync.

**Modelo de datos**

| Entidad | Campos principales | Notas |
| --- | --- | --- |
| `Report` | `id` (PK, servidor), `clientId` (UUID, único), `technicianId`, `customerName`, `serviceType`, `description`, `status`, `latitude`, `longitude`, `signatureUrl`, `createdAtClient`, `syncedAt` | `clientId` evita duplicados al reintentar; `createdAtClient` conserva la hora real de captura offline |
| `Photo` | `id`, `reportId` (FK), `url`, `mimeType`, `sizeBytes` | Máximo 3 por reporte |
| `User` | `id`, `name`, `email`, `passwordHash`, `role` | Rol `TECHNICIAN` o `SUPERVISOR` |
| `LocalReport` (IndexedDB) | los campos de `Report` + `syncState` (`pending`, `syncing`, `synced`, `error`), `retryCount`, `lastError`, `photos[]` (Blob) | Solo existe en el cliente |

**API REST (prefijo `/api/v1`)**

| Método y ruta | Función | Respuesta |
| --- | --- | --- |
| `POST /auth/login` | Entrega un JWT | 200 con token |
| `POST /reports` | Crea un reporte; si el `clientId` ya existe devuelve el existente | 201 o 200 (idempotente) |
| `POST /reports/:id/photos` | Sube una foto (multipart) | 201 |
| `GET /reports` | Lista con paginación y filtro por estatus | 200 |
| `GET /reports/:id` | Detalle | 200 o 404 |
| `PUT /reports/:id` | Actualiza estatus o campos | 200 |
| `DELETE /reports/:id` | Elimina | 204 |
| `GET /health` | Verificación para Docker y monitoreo | 200 |

La API se documenta con Swagger en `/api/docs`, y los errores siguen un formato único (`statusCode`, `message`, `error`). Se activa CORS solo para el origen del frontend.

## 10. Estrategia offline

El 30% de la rúbrica es offline, así que cada recurso tiene una estrategia de caché explícita y los datos del usuario viven en IndexedDB, nunca solo en memoria.

**Ciclo de vida del Service Worker**

1. **install:** precachea el App Shell (HTML, JS, CSS, íconos, `/offline.html`) y llama `skipWaiting()` solo cuando el usuario acepta la actualización.
2. **activate:** borra cachés de versiones anteriores y reclama clientes (`clients.claim()`).
3. **fetch:** enruta cada petición según la tabla siguiente.

**Estrategias de caché**

| Recurso | Estrategia | Razón |
| --- | --- | --- |
| App Shell (HTML, JS, CSS con hash) | Precache + Stale-While-Revalidate para el HTML | Carga instantánea y se actualiza en segundo plano |
| Íconos, fuentes e imágenes estáticas | Cache First | Casi nunca cambian |
| `GET /api/v1/reports` | Network First con *timeout* de 3 s y respaldo en caché | Datos frescos si hay red; si no, la última copia |
| `POST/PUT/DELETE /api/*` | Network Only; si falla, se encola en IndexedDB | Las escrituras no se cachean |
| Navegación sin red a una ruta desconocida | Respuesta de `/offline.html` | Requisito de instalabilidad |

**Sincronización de reportes**

- Al guardar, el reporte entra a IndexedDB con `syncState = pending` y la UI responde de inmediato.
- Disparadores de sincronización: evento `online`, apertura de la app, botón manual y `sync` (Background Sync) donde exista.
- Cada envío incluye el `clientId`; si el servidor ya lo tiene, responde con el registro existente y no se duplica.
- Reintentos con backoff exponencial (2 s, 4 s, 8 s… hasta 5 min); tras 5 fallos el reporte pasa a `error` y queda visible para reintento manual.
- Las fotos se suben después del reporte, una por una, para tolerar conexiones débiles.

**Esqueleto del Service Worker (Workbox)**

```ts
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies';

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/v1/reports'),
  new NetworkFirst({ cacheName: 'api-reports', networkTimeoutSeconds: 3 })
);

registerRoute(
  ({ request }) => request.destination === 'document',
  new StaleWhileRevalidate({ cacheName: 'pages' })
);

self.addEventListener('message', (e) => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
```

**Riesgos específicos de iOS y mitigación**

- Desalojo de datos tras días sin uso: mostrar contador de pendientes y pedir `navigator.storage.persist()`.
- Sin Background Sync: sincronizar al abrir la app y con botón manual.
- Cuota baja: comprimir fotos a ≤ 300 KB con canvas antes de guardarlas.

## 11. Docker y estructura del repositorio

Todo corre con Docker Compose: PostgreSQL, API NestJS, frontend con Vite en desarrollo (o Nginx en producción) y un túnel Ngrok opcional para probar en el celular con HTTPS.

**Estructura del monorepo**

```text
fieldreport/
├── apps/
│   ├── web/                 # React + Vite + PWA
│   │   ├── src/ (sw.ts, db.ts, sync.ts, pages/, components/)
│   │   ├── public/ (icons/, offline.html)
│   │   ├── Dockerfile
│   │   └── nginx.conf
│   └── api/                 # NestJS + Prisma
│       ├── src/ (reports/, auth/, health/)
│       ├── prisma/ (schema.prisma, migrations/)
│       └── Dockerfile
├── packages/shared/         # tipos y esquemas Zod
├── docker-compose.yml       # desarrollo
├── docker-compose.prod.yml  # producción local
├── .env.example
├── .github/workflows/ci.yml
└── docs/ (PRD, arquitectura, capturas)
```

**docker-compose.yml (desarrollo)**

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER} -d ${DB_NAME}"]
      interval: 5s
      retries: 10

  api:
    build: { context: ., dockerfile: apps/api/Dockerfile, target: dev }
    env_file: .env
    environment:
      DATABASE_URL: postgresql://${DB_USER}:${DB_PASSWORD}@db:5432/${DB_NAME}
    ports: ["3000:3000"]
    volumes: ["./apps/api:/app/apps/api", "/app/node_modules"]
    depends_on: { db: { condition: service_healthy } }

  web:
    build: { context: ., dockerfile: apps/web/Dockerfile, target: dev }
    environment:
      VITE_API_URL: http://localhost:3000/api/v1
    ports: ["5173:5173"]
    volumes: ["./apps/web:/app/apps/web", "/app/node_modules"]
    depends_on: [api]

  tunnel:
    image: ngrok/ngrok:latest
    profiles: ["tunnel"]
    command: http web:5173
    environment:
      NGROK_AUTHTOKEN: ${NGROK_AUTHTOKEN}
    ports: ["4040:4040"]
    depends_on: [web]

volumes:
  pgdata:
```

**Dockerfile del frontend (multi-stage)**

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
RUN npm ci
COPY . .

FROM base AS dev
WORKDIR /app/apps/web
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

FROM base AS build
WORKDIR /app/apps/web
RUN npm run build

FROM nginx:1.27-alpine AS prod
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
```

**Dockerfile de la API (multi-stage)**

```dockerfile
FROM node:22-alpine AS base
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/
RUN npm ci
COPY . .
WORKDIR /app/apps/api
RUN npx prisma generate

FROM base AS dev
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:dev"]

FROM base AS build
RUN npm run build

FROM node:22-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api/dist ./dist
COPY --from=build /app/apps/api/prisma ./prisma
USER node
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
```

**nginx.conf (puntos críticos para la PWA)**

- `sw.js` y `index.html` con `Cache-Control: no-cache`, para que las actualizaciones lleguen.
- Assets con hash en `/assets/` con `Cache-Control: public, max-age=31536000, immutable`.
- `manifest.webmanifest` con `Content-Type: application/manifest+json`.
- Fallback `try_files $uri /index.html` para el ruteo de la SPA, más gzip o brotli.

**Comandos del día a día**

```bash
cp .env.example .env
docker compose up --build                   # web :5173, api :3000
docker compose --profile tunnel up          # añade el túnel HTTPS (Ngrok)
docker compose exec api npx prisma studio   # inspeccionar la BD
docker compose -f docker-compose.prod.yml up --build
```

Nota: en desarrollo un Service Worker funciona en `localhost`, pero para el celular necesitas el túnel HTTPS. Usa `vite build && vite preview` (o el contenedor de producción) para auditar con Lighthouse, porque el servidor de desarrollo no refleja el precaché real.

## 12. CI/CD, auditoría y pruebas

**Aviso sobre la auditoría PWA.** El documento pide "100% en la categoría Progressive Web App de Lighthouse", pero desde Lighthouse 12 (Chrome 126 en adelante) esa categoría fue eliminada y la evidencia de PWA pasó al panel Application de DevTools. Consulta con el profesor qué evidencia acepta. Para cubrirte, el plan junta tres pruebas: Lighthouse 11 para sacar el puntaje clásico, el panel Application/Manifest/Installability de DevTools, y PWABuilder.

**Plan de auditoría**

| Herramienta | Qué valida | Evidencia |
| --- | --- | --- |
| `npx lighthouse@11 <url> --only-categories=pwa` | Puntaje PWA clásico (instalable, SW, manifest, offline) | Reporte HTML con 100% |
| DevTools → Application → Manifest / Service Workers | Instalable sin advertencias, SW activo, caché poblado | Capturas de pantalla |
| Lighthouse actual (Performance, Accessibility, Best Practices, SEO) | Calidad general en móvil | Reporte en la URL de producción |
| PWABuilder | Validación del manifiesto y del SW | Captura del reporte |
| DevTools → Network → Offline | App funcionando sin red | Video de la demo |

**Plan de pruebas**

| Tipo | Qué se prueba | Herramienta |
| --- | --- | --- |
| Unitarias | Lógica de sincronización, backoff, validaciones | Vitest, Jest (API) |
| Integración API | Endpoints, idempotencia por `clientId`, validación 400/413 | Supertest + PostgreSQL de prueba |
| E2E offline | Crear reporte sin red, recargar, sincronizar al volver | Playwright (`context.setOffline(true)`) |
| Manual en dispositivos | Instalar y operar en Chrome Android y Safari iOS | Teléfonos reales con Ngrok |
| Caos de red | Cortar la red a mitad de una sincronización | DevTools throttling |

**Casos de prueba clave**

- Crear 5 reportes en modo avión, cerrar la app, reabrirla sin red y ver los 5 en la lista.
- Volver a conectar y verificar que se crean 5 reportes en el servidor, sin duplicados.
- Reenviar el mismo `clientId` dos veces y confirmar que el servidor no crea un segundo registro.
- Publicar una nueva versión y verificar que aparece el aviso de actualización.

**Pipeline de CI/CD (GitHub Actions)**

1. En cada pull request: instalar, ESLint, Prettier, Vitest, build de web y API.
2. E2E con Playwright contra `docker compose up`.
3. Lighthouse CI sobre el build de producción, con umbrales mínimos.
4. En `main`: despliegue automático del frontend a Vercel o Netlify y de la API (imagen Docker) a Render, Railway o Fly.io.

**Variables de entorno de producción**

- `VITE_API_URL` apunta a la API pública con HTTPS.
- `DATABASE_URL`, `JWT_SECRET` y `CORS_ORIGIN` solo en el panel del proveedor, nunca en el repositorio.

## 13. Cronograma, rúbrica, riesgos y criterios de aceptación

**Plan de trabajo por semana** (días hábiles; ajusta a las fechas que dé el profesor)

| Día | Trabajo | Entregable |
| --- | --- | --- |
| S1 · D1 | Análisis de requerimientos, matriz de decisión PWA vs alternativas | Documento de arquitectura (parcial 1) |
| S1 · D2 | Investigación Chromium vs WebKit, tabla de compatibilidad y checklist de instalación | Tabla y checklist (parcial 2) |
| S1 · D3 | Monorepo, Docker Compose, PostgreSQL, Prisma, Ngrok | Entorno corriendo en HTTPS |
| S1 · D4 | API REST NestJS (`/reports`, `/health`) con Swagger | Endpoint funcional (parcial 3) |
| S1 · D5 | Buffer, capturas de evidencia y revisión | Paquete de evidencias S1 |
| S2 · D1 | UI responsiva, formulario y listado; manifest e íconos | App instalable con banner (parcial 4) |
| S2 · D2 | Service Worker (install, activate, fetch), App Shell y `/offline.html` | App abre sin red |
| S2 · D3 | IndexedDB (Dexie), cola de sincronización, idempotencia | Video en modo avión (parcial 5) |
| S2 · D4 | Auditorías, pruebas en Chrome Android y Safari iOS, ajustes | Reportes y capturas |
| S2 · D5 | Despliegue en producción, README, ensayo de defensa | Repositorio GitHub y URL (entregable final) |

**Trazabilidad con la rúbrica**

| Criterio (peso) | Dónde se cubre | Evidencia |
| --- | --- | --- |
| Análisis arquitectónico (20%) | Sección 6 | Matriz de decisión y justificación |
| Entorno y configuración (15%) | Secciones 8 y 11 | Capturas de Docker, Ngrok y DevTools en HTTPS |
| Instalabilidad y compatibilidad (20%) | Sección 7, RF-13 y RF-14 | Instalación en Android y iOS |
| Capacidad offline (30%) | Sección 10, RF-05 a RF-09, RF-15 y RF-16 | Video en modo avión, pruebas E2E |
| Calidad tecnológica (15%) | Sección 12 | Reportes de auditoría y URL en producción |

**Riesgos**

| Riesgo | Probabilidad | Impacto | Mitigación |
| --- | --- | --- | --- |
| La categoría PWA ya no existe en Lighthouse reciente | Alta | Alto | Usar Lighthouse 11, panel Application y PWABuilder; confirmar con el profesor |
| iOS no tiene Background Sync ni prompt de instalación | Cierta | Medio | Sincronizar al abrir y con botón; guía visual de instalación |
| El Service Worker cachea una versión vieja y no se actualiza | Media | Alto | `no-cache` en `sw.js`, aviso de actualización, versionado de caché |
| Desalojo de IndexedDB en iOS | Media | Alto | `storage.persist()`, contador de pendientes, fotos comprimidas |
| El túnel Ngrok se cae o cambia de URL | Media | Bajo | Alternativa con Cloudflare Tunnel; probar con el despliegue de Vercel |
| Falta de tiempo en la semana 2 | Media | Alto | Priorizar los "Must"; las fotos y la firma son opcionales |
| No tener un iPhone para pruebas | Media | Medio | Pedir uno prestado o usar un simulador con Xcode (limitado) y una prueba real al final |

**Criterios de aceptación (definición de terminado)**

- [ ] La app se instala en Chrome Android y en Safari iOS y abre en modo `standalone`.
- [ ] Con modo avión: abre, muestra la lista, crea y edita reportes sin errores.
- [ ] Al volver la red, todos los pendientes se sincronizan sin duplicados.
- [ ] Evidencia de PWA completa (Lighthouse 11, panel Application y PWABuilder).
- [ ] Despliegue público con HTTPS y repositorio de GitHub con README.
- [ ] `docker compose up` levanta todo en una máquina limpia.
- [ ] Documento de arquitectura, tabla de compatibilidad y checklist entregados.

**Preguntas abiertas**

- ¿Qué evidencia de Lighthouse acepta el profesor, dado que la categoría PWA ya no existe?
- ¿Hay que implementar login o basta un usuario demo?
- ¿Se trabaja en equipo o individual? Eso define si se usa monorepo con ramas por persona.
