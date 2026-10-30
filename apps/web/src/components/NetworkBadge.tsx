import { useOnline } from '../pwa/useOnline';

export function NetworkBadge() {
  const online = useOnline();
  return (
    <span
      role="status"
      className={`rounded-full px-3 py-1 text-sm font-semibold ${
        online
          ? 'bg-emerald-100 text-emerald-900'
          : 'bg-amber-100 text-amber-900'
      }`}
    >
      {online ? 'En línea' : 'Sin conexión'}
    </span>
  );
}
