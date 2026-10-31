# Avance 11: estado de red real, mensajes de validación y documento de arquitectura

## Qué se hizo

1. **La etiqueta "En línea" ya no depende solo de `navigator.onLine`.** Ese valor solo indica que hay una interfaz de red; con Wi-Fi sin salida a internet seguía en `true` y la app decía "En línea". Ahora `src/pwa/useOnline.ts` confirma con `GET /api/v1/health` (al montar, cada 15 s y al volver el evento `online`; tiempo máximo 5 s) y baja de inmediato con el evento `offline`. Es un único *store* compartido por `NetworkBadge`, `Login` y `ReportList`, que solo consulta mientras haya algún componente suscrito.
2. **Mensajes de latitud y longitud en español y sin símbolos.** Salían los textos por defecto de Zod (`Too small: expected number to be >=-90`). En `packages/shared/src/report.ts` ahora son `La latitud debe estar entre -90 y 90`, `La longitud debe estar entre -180 y 180` y `Escribe la latitud como número`. Como el esquema es compartido, la API devuelve los mismos textos.
3. **Documento de arquitectura:** [`doc/arquitectura.md`](../arquitectura.md) (una página: capas, flujo offline, modelo de datos, API, seguridad, entornos y acceso a las bases de datos).
4. **Acceso a la base de datos local desde DBeaver.** El servicio `db` de `docker-compose.yml` no publicaba ningún puerto. Ahora publica `127.0.0.1:5433 → 5432`. Se usa 5433 porque en este equipo ya hay otro servicio escuchando en `127.0.0.1:5432` que **no** es el del proyecto (los contenedores estaban detenidos). Credenciales en el documento de arquitectura.

## Evidencia

| Prueba | Resultado |
| --- | --- |
| Vitest de la web (`npm test -w @fieldreport/web`) | 19 de 19 (3 nuevas en `validation.test.ts`: fuera de rango, no numérico, válidos/vacíos) |
| `tsc --noEmit` de la web y del SW | sin errores |
| `psql -h 127.0.0.1 -p 5433 -U fieldreport -d fieldreport` | conecta y lista `User`, `Report` y `_prisma_migrations` |
| Playwright contra el contenedor de producción (`docker-compose.prod.yml`) | **17 de 17** aplicables, 1 omitida (solo de nginx). Nueva: *Wi-Fi sin salida: la etiqueta dice Sin conexión aunque `navigator.onLine` sea `true`* (aborta `/api/v1/health` con el SW bloqueado) |

## Decisiones y desviaciones

- **El indicador mide "alcanzo la API", no "tengo internet".** Es lo que importa para sincronizar y iniciar sesión, pero si el servidor falla o está dormido (Render gratuito, ~1 min) la etiqueta también dirá "Sin conexión" y el botón *Entrar* se deshabilita hasta que responda el health (la propia consulta lo despierta).
- Los mensajes en español de las coordenadas se reutilizan en la API, pero la API los antepone con el nombre del campo en inglés (`latitude: …`, `ZodPipe`). Solo se vería si un reporte llegara al servidor con coordenadas inválidas, algo que el formulario ya impide. No se cambió.
- El puerto de PostgreSQL queda publicado solo en `127.0.0.1`, nunca en la red.

## No verificado

- Que **DBeaver para Windows** conecte a `localhost:5433` desde WSL2 (se probó con `psql` desde WSL). Si no conecta, cambiar el mapeo a `"5433:5432"`.
- El indicador con una pérdida real de internet en un teléfono (solo se simuló abortando el health y con `context.setOffline`).
- Las pruebas de la API contra PostgreSQL (`docker compose exec -T api npm test`): la imagen de desarrollo trae `shared` compilado de antes del cambio; no se reconstruyó.
- No se desplegó: los cambios están sin commit ni push, por lo que Vercel y Render siguen con la versión anterior.

## Siguiente paso

Hacer commit y push a `develop`, probar la etiqueta en el teléfono (modo avión y Wi-Fi sin datos) y definir si se atiende RF-03 (fotos) y RF-04 (firma).
