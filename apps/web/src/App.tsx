import { useEffect } from 'react';
import { startAutoSync } from './autosync';
import { InstallButton } from './components/InstallButton';
import { NetworkBadge } from './components/NetworkBadge';
import { Login } from './pages/Login';
import { ReportDetail } from './pages/ReportDetail';
import { ReportForm } from './pages/ReportForm';
import { ReportList } from './pages/ReportList';
import { UpdateBanner } from './pwa/UpdateBanner';
import { useRoute } from './router';
import { logout } from './session';
import { useToken } from './useSession';

function Page() {
  const [, section, id, action] = useRoute().split('/');
  if (section === 'new') return <ReportForm />;
  if (section === 'r' && id)
    return <ReportDetail clientId={id} edit={action === 'edit'} />;
  return <ReportList />;
}

export function App() {
  const token = useToken();

  // Pide al navegador que no desaloje la base local si falta espacio (RNF-12).
  useEffect(() => {
    void navigator.storage?.persist?.();
  }, []);

  // Solo con sesión: sin token el servidor rechazaría todo.
  useEffect(() => (token ? startAutoSync() : undefined), [token]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-3 bg-teal-700 p-4 pt-[max(1rem,env(safe-area-inset-top))] text-white">
        <h1 className="text-xl font-bold">FieldReport</h1>
        <div className="flex items-center gap-3">
          <NetworkBadge />
          <InstallButton />
          {token && (
            <button
              onClick={logout}
              className="min-h-11 px-2 text-sm underline"
            >
              Salir
            </button>
          )}
        </div>
      </header>
      <main>{token === undefined ? null : token ? <Page /> : <Login />}</main>
      <UpdateBanner />
    </div>
  );
}
