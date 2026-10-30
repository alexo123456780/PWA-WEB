# Avance 02 · API REST (NestJS + Prisma + PostgreSQL)

Fecha: 2026-10-29 · Cronograma PRD: S1 · D3 y D4 · Cubre RF-11, RF-12, RNF-05

## Qué se hizo

API en `apps/api`, corriendo en Docker junto a PostgreSQL (`docker compose up -d --wait api`).

| Método y ruta (`/api/v1`) | Función | Respuesta |
| --- | --- | --- |
| `POST /auth/login` | JWT para el usuario demo | 200 · 401 |
| `POST /reports` | Crea; si el `clientId` ya existe devuelve el existente | 201 (nuevo) · 200 (repetido) |
| `GET /reports` | Lista, filtro `status`, paginación `page`/`limit` (máx. 100) | 200 |
| `GET /reports/:id` | Detalle | 200 · 404 |
| `PUT /reports/:id` | Actualiza campos o estatus | 200 · 404 |
| `DELETE /reports/:id` | Elimina | 204 · 404 |
| `GET /health` | Hace `SELECT 1`; lo usa el healthcheck de Docker | 200 |

- Swagger en `http://localhost:3000/api/docs`.
- Esquema Prisma: `User`, `Report` (con `clientId` único) y los enums. Migración inicial `20261030041826_init`.
- Usuario demo creado al arrancar desde `DEMO_EMAIL` / `DEMO_PASSWORD` del `.env` (contraseña con `scrypt` de `node:crypto`, sin dependencia extra).
- Todas las rutas de `/reports` exigen `Authorization: Bearer <token>` y solo ven los reportes del usuario dueño.
- CORS limitado a `CORS_ORIGIN`. Body JSON limitado a 100 KB (413 si se excede).

## Cómo verificar

```bash
docker compose up -d --wait api
curl localhost:3000/api/v1/health                      # {"status":"ok"}
docker compose exec -T api npm test                    # e2e contra la BD real
```

Resultado en esta sesión: **6 de 6 pruebas pasan**:

- health ok;
- 401 con credenciales malas y sin token;
- crear 201 y reenviar el mismo `clientId` da 200 con el mismo `id` y una sola fila;
- **3 envíos concurrentes del mismo `clientId` dan `[201, 200, 200]` y una sola fila** (la carrera se resuelve con el `UNIQUE` y el código `P2002` de Prisma);
- entrada inválida da 400 con un mensaje por campo; body de 200 KB da 413;
- listar con filtro, leer, editar, eliminar y 404 posterior.

También se construyó y arrancó el target `prod` del Dockerfile (corre `prisma migrate deploy` como `USER node` y responde en `/health`). Pesa 785 MB, porque lleva el CLI de Prisma para migrar al arrancar; aceptable para el prototipo.

## Decisiones y desviaciones del PRD

- **Zod en lugar de `class-validator`** (ya anotado en el avance 01). Costo: Swagger documenta rutas y autenticación, pero no el esquema del body.
- **Prisma 7.10.1 fijado.** El `latest` de npm es hoy `8.0.0-rc.28` (candidato a versión), así que se usa la última estable. Prisma 7 pide `prisma.config.ts` y un driver adapter (`@prisma/adapter-pg`).
- **Token de 7 días.** Los técnicos pasan días sin red; un token corto les impediría sincronizar. Responde parte de la pregunta abierta del PRD sobre login: hay login real pero con un solo usuario demo.
- **Sin rol `SUPERVISOR` en uso todavía.** El rol existe en el modelo, pero no hay usuario supervisor ni vista de supervisor (fuera del MVP según RF).
- **Sin `POST /reports/:id/photos`.** Fotos (RF-03) y firma (RF-04) son Should/Could; se harán después de cerrar los Must.
- **Healthcheck con `127.0.0.1`**, no `localhost`: en Alpine `localhost` resuelve a IPv6 y la API escucha en IPv4.
- **Dev:** el `CMD` hace `prisma generate` antes de arrancar, porque el bind mount de `apps/api` tapa el cliente generado en la imagen (importante en una máquina limpia).

## Trampas conocidas

- El volumen anónimo `/app/node_modules` conserva dependencias viejas: tras cambiar `package.json` usa `docker compose up --build -V`.
- Las pruebas e2e se corren dentro del contenedor (la BD no está publicada al host). Limpian los reportes que crean.
- El `npm` local (11.19) avisa de scripts de instalación no aprobados (`prisma`, `@scarf/scarf`); es inofensivo, en Docker se ejecutan normal.

## Pendiente / siguiente

- Avance 03: web con Vite + React, manifest, íconos y botón "Instalar app". Ahí se cambia `VITE_API_URL` del compose del PRD (`http://localhost:3000`) por un proxy de Vite hacia `/api`, para que el celular llegue a la API a través del túnel HTTPS.
