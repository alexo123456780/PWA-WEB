// Sincronizador: se ejecuta tanto en la ventana como en el Service Worker (Background Sync),
// por eso no usa nada propio de `window`.
import { ApiError, api } from './api';
import { db, type LocalReport } from './db';
import { expireSession } from './session';

export const MAX_RETRIES = 5;
const BASE_DELAY_MS = 2000;
const MAX_DELAY_MS = 5 * 60_000;

// 2 s, 4 s, 8 s… con tope de 5 min.
export const backoffMs = (failures: number) =>
  Math.min(BASE_DELAY_MS * 2 ** (failures - 1), MAX_DELAY_MS);

// Sin respuesta (red caída) o servidor con problemas: vale la pena reintentar.
// Un 4xx (p. ej. 400 por datos inválidos) fallaría igual cada vez.
const isTransient = (e: unknown) =>
  !(e instanceof ApiError) ||
  e.status >= 500 ||
  e.status === 408 ||
  e.status === 429;

const toPayload = (r: LocalReport) => ({
  clientId: r.clientId,
  customerName: r.customerName,
  serviceType: r.serviceType,
  description: r.description,
  status: r.status,
  latitude: r.latitude,
  longitude: r.longitude,
  createdAtClient: r.createdAtClient,
});

// Toma, en orden de captura, los reportes pendientes cuyo reintento ya toca y los marca `syncing`.
function claimDue() {
  return db.transaction('rw', db.reports, async () => {
    // Con el candado en nuestras manos nadie más está enviando: lo que siga en `syncing`
    // quedó huérfano (app cerrada a mitad de envío) y vuelve a la cola. El servidor
    // es idempotente por clientId, así que reenviarlo no duplica.
    await db.reports
      .where('syncState')
      .equals('syncing')
      .modify({ syncState: 'pending' });
    const pending = await db.reports
      .where('syncState')
      .equals('pending')
      .sortBy('createdAtClient');
    const due = pending.filter(
      (r) => !r.nextRetryAt || r.nextRetryAt <= Date.now(),
    );
    await Promise.all(
      due.map((r) => db.reports.update(r.clientId, { syncState: 'syncing' })),
    );
    return due;
  });
}

function recordFailure(report: LocalReport, error: unknown) {
  const failures = report.retryCount + 1;
  const giveUp = !isTransient(error) || failures >= MAX_RETRIES;
  return db.reports.update(report.clientId, {
    syncState: giveUp ? 'error' : 'pending',
    retryCount: failures,
    nextRetryAt: giveUp ? undefined : Date.now() + backoffMs(failures),
    lastError:
      error instanceof ApiError
        ? error.message
        : 'Sin conexión con el servidor',
  });
}

async function run() {
  const batch = await claimDue();
  for (const [i, report] of batch.entries()) {
    try {
      const saved = await api.post<{ id: string }>(
        '/reports',
        toPayload(report),
      );
      await db.reports.update(report.clientId, {
        syncState: 'synced',
        serverId: saved.id,
        retryCount: 0,
        nextRetryAt: undefined,
        lastError: undefined,
      });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        // Sesión vencida: no es culpa del reporte, así que no cuenta como intento fallido.
        const rest = batch.slice(i).map((r) => r.clientId);
        await db.reports
          .where('clientId')
          .anyOf(rest)
          .modify({ syncState: 'pending' });
        await expireSession();
        return;
      }
      await recordFailure(report, e);
    }
  }
}

export async function syncNow() {
  if (!navigator.onLine) return;
  // Un solo sincronizador a la vez entre pestañas y Service Worker.
  await navigator.locks.request(
    'fieldreport-sync',
    { ifAvailable: true },
    async (lock) => {
      if (lock) await run();
    },
  );
}
