import { useInstallPrompt } from '../pwa/useInstallPrompt';

export function InstallButton() {
  const { canPrompt, install, needsIosGuide } = useInstallPrompt();

  if (canPrompt) {
    return (
      <button
        onClick={install}
        className="min-h-11 rounded-lg bg-white px-4 font-semibold text-teal-800"
      >
        Instalar app
      </button>
    );
  }
  if (needsIosGuide) {
    return (
      <p className="max-w-48 text-xs leading-tight">
        Para instalar: toca <b>Compartir</b> y luego{' '}
        <b>Añadir a pantalla de inicio</b>.
      </p>
    );
  }
  return null;
}
