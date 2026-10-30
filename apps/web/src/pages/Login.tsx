import { useState, type FormEvent } from 'react';
import { ApiError, login } from '../api';
import { useOnline } from '../pwa/useOnline';
import { useSessionExpired } from '../useSession';

export function Login() {
  const online = useOnline();
  const expired = useSessionExpired();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      await login(String(data.get('email')), String(data.get('password')));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 401
          ? 'Correo o contraseña incorrectos'
          : 'No se pudo conectar con el servidor',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="mx-auto flex max-w-sm flex-col gap-4 p-4"
    >
      <h2 className="text-xl font-bold">Iniciar sesión</h2>
      {expired && (
        <p role="alert" className="rounded-lg bg-amber-100 p-3 text-amber-900">
          Tu sesión expiró. Inicia sesión para sincronizar tus reportes; los que
          tienes guardados no se pierden.
        </p>
      )}
      {!online && (
        <p role="alert" className="rounded-lg bg-amber-100 p-3 text-amber-900">
          Necesitas conexión para iniciar sesión.
        </p>
      )}
      <label className="flex flex-col gap-1">
        Correo
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="min-h-11 rounded-lg border border-slate-400 px-3 text-base"
        />
      </label>
      <label className="flex flex-col gap-1">
        Contraseña
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="min-h-11 rounded-lg border border-slate-400 px-3 text-base"
        />
      </label>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      <button
        disabled={busy || !online}
        className="min-h-11 rounded-lg bg-teal-700 px-4 font-semibold text-white disabled:opacity-50"
      >
        Entrar
      </button>
    </form>
  );
}
