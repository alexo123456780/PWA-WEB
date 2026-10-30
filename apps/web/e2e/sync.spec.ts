import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';

const EMAIL = process.env.DEMO_EMAIL ?? 'tecnico@fieldreport.test';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'demo1234';

// Nombre único por ejecución: permite contar en el servidor solo lo que creó esta prueba.
const tag = () => `E2E-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

async function apiHeaders(request: APIRequestContext) {
  const res = await request.post('/api/v1/auth/login', {
    data: { email: EMAIL, password: PASSWORD },
  });
  return { Authorization: `Bearer ${(await res.json()).accessToken}` };
}

async function serverReports(request: APIRequestContext, prefix: string) {
  const headers = await apiHeaders(request);
  const res = await request.get('/api/v1/reports?limit=100', { headers });
  const { items } = await res.json();
  return items.filter((r: { customerName: string }) =>
    r.customerName.startsWith(prefix),
  );
}

async function cleanUp(request: APIRequestContext, prefix: string) {
  const headers = await apiHeaders(request);
  for (const r of await serverReports(request, prefix)) {
    await request.delete(`/api/v1/reports/${r.id}`, { headers });
  }
}

async function loginWithNetwork(page: Page) {
  await page.goto('/');
  await page.getByLabel('Correo').fill(EMAIL);
  await page.getByLabel('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('link', { name: 'Nuevo reporte' })).toBeVisible();
}

async function createReport(page: Page, customer: string) {
  await page.getByRole('link', { name: 'Nuevo reporte' }).click();
  await page.getByLabel('Cliente').fill(customer);
  await page.getByLabel('Descripción').fill('Bomba de agua sin presión');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(
    page.getByRole('link', { name: new RegExp(customer) }),
  ).toBeVisible();
}

test('sincroniza solo al recuperar la red: ≤ 10 s y sin duplicados', async ({
  page,
  context,
  request,
}) => {
  const prefix = tag();
  await loginWithNetwork(page);
  await context.setOffline(true);
  for (const n of [1, 2, 3]) await createReport(page, `${prefix}-${n}`);
  await expect(page.getByText('3 reportes sin sincronizar')).toBeVisible();
  expect(await serverReports(request, prefix)).toHaveLength(0);

  const t0 = Date.now();
  await context.setOffline(false);
  await expect(page.getByText('Sincronizado', { exact: true })).toHaveCount(3, {
    timeout: 10_000,
  });
  expect(Date.now() - t0).toBeLessThanOrEqual(10_000);

  const saved = await serverReports(request, prefix);
  expect(saved).toHaveLength(3);
  expect(new Set(saved.map((r: { clientId: string }) => r.clientId)).size).toBe(
    3,
  );
  await cleanUp(request, prefix);
});

test.describe('con el Service Worker bloqueado', () => {
  // page.route no ve lo que atiende un SW; aquí se prueba el sincronizador, no el SW.
  test.use({ serviceWorkers: 'block' });

  test('un corte de red a mitad del envío se reintenta con backoff y no duplica', async ({
    page,
    request,
  }) => {
    const prefix = tag();
    let attempts = 0;
    await page.route('**/api/v1/reports', async (route) => {
      if (route.request().method() !== 'POST') return route.continue();
      attempts++;
      return attempts === 1 ? route.abort('connectionreset') : route.continue();
    });
    await loginWithNetwork(page);
    await createReport(page, prefix);

    await expect(page.getByText('Sincronizado', { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    expect(attempts).toBe(2);
    expect(await serverReports(request, prefix)).toHaveLength(1);
    await cleanUp(request, prefix);
  });
});

test('Background Sync: el Service Worker envía lo pendiente con la app cerrada', async ({
  page,
  context,
  request,
}) => {
  const prefix = tag();
  await loginWithNetwork(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await createReport(page, prefix);
  await page.close(); // sin ventana de la app: solo puede sincronizar el SW
  expect(await serverReports(request, prefix)).toHaveLength(0);
  await context.setOffline(false);

  // Equivale al botón "Sync" de DevTools → Application → Service Workers.
  const probe = await context.newPage();
  const cdp = await context.newCDPSession(probe);
  const registrations = new Map<
    string,
    { registrationId: string; scopeURL: string }
  >();
  cdp.on(
    'ServiceWorker.workerRegistrationUpdated',
    ({ registrations: list }) => {
      for (const r of list) registrations.set(r.registrationId, r);
    },
  );
  await cdp.send('ServiceWorker.enable');
  await expect.poll(() => registrations.size).toBeGreaterThan(0);
  const { registrationId, scopeURL } = [...registrations.values()][0];
  await cdp.send('ServiceWorker.dispatchSyncEvent', {
    origin: new URL(scopeURL).origin,
    registrationId,
    tag: 'sync-reports',
    lastChance: false,
  });

  await expect
    .poll(() => serverReports(request, prefix).then((r) => r.length), {
      timeout: 10_000,
    })
    .toBe(1);
  await cleanUp(request, prefix);
});
