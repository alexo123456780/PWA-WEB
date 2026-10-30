import type { ReportForm, SyncState } from '@fieldreport/shared';
import Dexie, { type EntityTable } from 'dexie';

// Fuente de verdad del cliente: la UI siempre lee y escribe aquí, nunca espera a la red.
export interface LocalReport extends ReportForm {
  clientId: string;
  createdAtClient: string;
  syncState: SyncState;
  retryCount: number;
  // Instante (ms) a partir del cual se puede reintentar el envío.
  nextRetryAt?: number;
  lastError?: string;
  // Id asignado por el servidor tras sincronizar.
  serverId?: string;
}

// Pares clave/valor de la sesión ('token', 'expired'). Viven en IndexedDB y no en localStorage
// porque el Service Worker también necesita el token para sincronizar con la app cerrada.
export interface Meta {
  key: string;
  value: string;
}

export const db = new Dexie('fieldreport') as Dexie & {
  reports: EntityTable<LocalReport, 'clientId'>;
  meta: EntityTable<Meta, 'key'>;
};

db.version(1).stores({ reports: 'clientId, syncState, createdAtClient' });
db.version(2).stores({
  reports: 'clientId, syncState, createdAtClient',
  meta: 'key',
});
