import { expect, test, type Page } from '@playwright/test';

// La primera visita debe ser con red: el SW precachea el App Shell y toma el control.
async function visitAndWaitForSw(page: Page) {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
}

test('es instalable: Chrome no reporta errores de instalabilidad', async ({
  page,
  context,
}) => {
  await visitAndWaitForSw(page);
  const cdp = await context.newCDPSession(page);
  const { installabilityErrors } = await cdp.send(
    'Page.getInstallabilityErrors',
  );
  expect(installabilityErrors).toEqual([]);
});

test('el manifest tiene los campos y íconos exigidos', async ({ request }) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json();
  expect(manifest).toMatchObject({
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: expect.any(String),
    background_color: expect.any(String),
  });
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toEqual(expect.arrayContaining(['192x192', '512x512']));
  expect(
    manifest.icons.some((i: { purpose?: string }) => i.purpose === 'maskable'),
  ).toBe(true);
  for (const icon of manifest.icons) {
    expect((await request.get(`/${icon.src}`)).status()).toBe(200);
  }

  // Sin capturas (móvil y escritorio) Chrome avisa de que no habrá interfaz de instalación enriquecida.
  const factors = manifest.screenshots.map(
    (s: { form_factor: string }) => s.form_factor,
  );
  expect(factors).toEqual(expect.arrayContaining(['narrow', 'wide']));
  for (const shot of manifest.screenshots) {
    const res = await request.get(`/${shot.src}`);
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toBe('image/png');
  }
});

test('abre sin conexión después de la primera visita', async ({
  page,
  context,
}) => {
  await visitAndWaitForSw(page);
  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'FieldReport' }),
  ).toBeVisible();
  await expect(
    page.getByRole('status').filter({ hasText: 'Sin conexión' }),
  ).toBeVisible();
});

test('una ruta fuera de la SPA sin red responde /offline.html', async ({
  page,
  context,
}) => {
  await visitAndWaitForSw(page);
  await context.setOffline(true);
  await page.goto('/api/docs');
  await expect(
    page.getByRole('heading', { name: 'Sin conexión' }),
  ).toBeVisible();
});
