import type { ReportStatus, ServiceType, SyncState } from '@fieldreport/shared';

export const SERVICE_LABELS: Record<ServiceType, string> = {
  INSTALLATION: 'Instalación',
  MAINTENANCE: 'Mantenimiento',
  REPAIR: 'Reparación',
  INSPECTION: 'Inspección',
};

export const STATUS_LABELS: Record<ReportStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En curso',
  DONE: 'Terminado',
};

export const SYNC_LABELS: Record<SyncState, string> = {
  pending: 'Pendiente de sincronizar',
  syncing: 'Sincronizando…',
  synced: 'Sincronizado',
  error: 'Error al sincronizar',
};
