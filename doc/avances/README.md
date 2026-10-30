# Bitácora de avances y estado del proyecto

Un documento por avance, en orden. Estado contra el PRD al 2026-10-29. Leyenda: ✅ hecho y probado · 🟡 hecho con reservas · ⬜ pendiente.

| # | Avance |
| --- | --- |
| 01 | [Monorepo, `shared` y PostgreSQL](01-monorepo-y-base-de-datos.md) |
| 02 | [API NestJS + Prisma](02-api-nestjs-prisma.md) |
| 03 | [Cascarón PWA: manifest, Service Worker, offline, Docker de la web](03-cascaron-pwa-y-service-worker.md) |
| 04 | [Login y reportes offline sobre IndexedDB](04-reportes-offline-con-indexeddb.md) |
| 05 | [Sincronización: cola, backoff, Background Sync](05-sincronizacion.md) |
| 06 | [Seguridad, auditoría Lighthouse y entorno limpio](06-seguridad-auditoria-y-entorno-limpio.md) |
| 07 | [Repositorio, CI/CD y configuración de despliegue](07-despliegue-y-cicd.md) |
| 08 | [Web desplegada en Vercel](08-web-desplegada-en-vercel.md) — https://pwa-web-dun.vercel.app |
| 09 | [API en Render y conexión con la web](09-api-en-render-y-conexion.md) — https://fieldreport-api.onrender.com |

## Criterios de aceptación (PRD, sección 13)

| Criterio | Estado | Nota |
| --- | --- | --- |
| Se instala en Chrome Android y Safari iOS y abre `standalone` | ⬜ | Chrome confirma instalabilidad sin errores (headless); falta el dispositivo real |
| Modo avión: abre, lista, crea y edita sin errores | 🟡 | E2E con red cortada en Chromium; falta probarlo en teléfono |
| Al volver la red, sincroniza sin duplicados | ✅ | E2E: 3 reportes, ≤ 10 s, `clientId` únicos; corte a mitad de envío; carrera concurrente en la API |
| Evidencia PWA (Lighthouse 11, Application, PWABuilder) | 🟡 | Lighthouse 11 = 100 % también sobre la URL pública; faltan PWABuilder y capturas de *Application* (manuales) |
| Despliegue público HTTPS + repo GitHub con README | 🟡 | Web (Vercel) y API (Render) en producción y conectadas; CI en verde; repo público con README. Falta correr login/sincronización E2E contra producción (necesita la contraseña demo) |
| `docker compose up` en una máquina limpia | ✅ | Verificado desde un clon sin `node_modules` ni `.env`: 55 s |
| Documento de arquitectura, tabla de compatibilidad y checklist | ✅ | PRD secciones 6 y 7; checklist de instalación actualizado en el avance 03 |

## Requerimientos funcionales

| ID | Estado | ID | Estado |
| --- | --- | --- | --- |
| RF-01 Formulario con validación | ✅ | RF-10 Editar/eliminar pendiente | ✅ |
| RF-02 Geolocalización + manual | 🟡 sin probar con GPS | RF-11 API REST | 🟡 falta `/photos` |
| RF-03 Fotos comprimidas | ⬜ | RF-12 Idempotencia `clientId` | ✅ |
| RF-04 Firma en canvas | ⬜ | RF-13 Manifest e íconos | ✅ |
| RF-05 Guardar en IndexedDB | ✅ | RF-14 Botón instalar + guía iOS | 🟡 clic real sin probar |
| RF-06 Cola con backoff | ✅ | RF-15 Service Worker | ✅ |
| RF-07 Sync `online` + Background Sync | ✅ solo Chromium | RF-16 `/offline.html` | ✅ |
| RF-08 Indicadores de red y estado | ✅ | RF-17 Aviso de nueva versión | 🟡 sin prueba automática |
| RF-09 Lista y detalle offline | ✅ | | |

## Métricas de éxito (PRD, sección 1)

| Métrica | Meta | Resultado |
| --- | --- | --- |
| Auditoría PWA | 100 % | ✅ 100 % (Lighthouse 11.7.1) |
| Reportes offline sin pérdida | 100 % en 20 pruebas manuales | ⬜ solo automatizadas; falta la tanda manual |
| Sincronización automática | ≤ 10 s | ✅ E2E exige ≤ 10 s |
| Instalación real | Android + iOS | ⬜ |
| Performance móvil | ≥ 90 | ✅ 97 (simulado, local) |
| Entorno local | 1 comando | ✅ |

## Preguntas abiertas del PRD

- ¿Qué evidencia de Lighthouse acepta el profesor? Se entrega Lighthouse 11 (100 % PWA), la prueba de instalabilidad de Chrome y, tras el despliegue, PWABuilder.
- ¿Login o usuario demo? Hay login real contra la API con un único usuario demo.
- ¿Equipo o individual? Sin definir; el repositorio es un monorepo único.
