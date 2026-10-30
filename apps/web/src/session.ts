import { db } from './db';

export async function getToken() {
  return (await db.meta.get('token'))?.value ?? null;
}

export function setToken(token: string) {
  return db.transaction('rw', db.meta, async () => {
    await db.meta.put({ key: 'token', value: token });
    await db.meta.delete('expired');
  });
}

// El servidor rechazó el token (401): se pide iniciar sesión, los reportes locales no se tocan.
export function expireSession() {
  return db.transaction('rw', db.meta, async () => {
    await db.meta.delete('token');
    await db.meta.put({ key: 'expired', value: '1' });
  });
}

// Las respuestas de la API se guardan en el caché del SW: se borran para no dejarlas a otro usuario.
export async function logout() {
  await db.meta.delete('token');
  await caches.delete('api-reports-v1');
}
