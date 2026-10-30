import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

// `undefined` mientras carga; `null` si no hay sesión.
export const useToken = () =>
  useLiveQuery(async () => (await db.meta.get('token'))?.value ?? null);

export const useSessionExpired = () =>
  useLiveQuery(
    async () => (await db.meta.get('expired')) !== undefined,
    [],
    false,
  );
