# Avance 01 · Monorepo, paquete `shared` y PostgreSQL

Fecha: 2026-10-29 · Cronograma PRD: S1 · D3 (primera parte)

## Qué se hizo

- Monorepo con npm workspaces: `apps/*` y `packages/*`.
- `packages/shared` (`@fieldreport/shared`): esquemas Zod del reporte (`reportInputSchema`, `reportUpdateSchema`), constantes (`SERVICE_TYPES`, `REPORT_STATUSES`, `SYNC_STATES`) y tipos. Se compila a `dist/` en ESM.
- `docker-compose.yml` con PostgreSQL 16 y healthcheck. Los servicios `api` y `web` se añaden en los siguientes avances, cuando existan sus Dockerfiles.
- `.env.example` (copiado a `.env`, que está en `.gitignore`), Prettier y `.gitignore`.

## Cómo verificar

```bash
cp .env.example .env
npm install
npm run build:shared      # genera packages/shared/dist
docker compose up -d --wait db
docker compose ps         # db en estado "healthy"
```

Resultado en esta sesión: `db` quedó `healthy`, `shared` compila sin errores y `npm install` reporta 0 vulnerabilidades.

## Decisiones

- **Todo es ESM.** Nest 12 (la versión actual en npm) es solo ESM, así que `shared`, la API y la web usan `"type": "module"` y `shared` se consume desde `dist/`. Hay que recompilarlo (`npm run build:shared`) cuando cambie.
- **Zod como única fuente de validación.** El PRD menciona DTOs con `class-validator` en la API y Zod en el formulario. Se usa Zod en ambos lados (esquema compartido) para no duplicar reglas; la API lo aplicará con un pipe pequeño. Es una desviación menor del PRD (sección 8: "Validación compartida con el backend" es justo el motivo de Zod).
- **Estados del reporte:** `OPEN`, `IN_PROGRESS`, `DONE` (el PRD solo habla de "estatus"; es el que cambia el supervisor). Tipos de servicio: `INSTALLATION`, `MAINTENANCE`, `REPAIR`, `INSPECTION`.

## Pendiente / siguiente

- Avance 02: API NestJS + Prisma (RF-11, RF-12, `/health`, JWT demo, Swagger).
