import type { SyncState } from '@fieldreport/shared';
import { SYNC_LABELS } from '../labels';

const STYLES: Record<SyncState, string> = {
  pending: 'bg-amber-100 text-amber-900',
  syncing: 'bg-sky-100 text-sky-900',
  synced: 'bg-emerald-100 text-emerald-900',
  error: 'bg-red-100 text-red-900',
};

export function SyncBadge({ state }: { state: SyncState }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-sm font-semibold ${STYLES[state]}`}
    >
      {SYNC_LABELS[state]}
    </span>
  );
}
