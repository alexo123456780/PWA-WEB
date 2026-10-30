import { expect, test } from '@playwright/test';

// Solo aplica al contenedor nginx de producción (BASE_URL), no a `vite preview`.
test.skip(!process.env.BASE_URL, 'requiere el contenedor nginx');

test('cabeceras de caché y tipo del manifest', async ({ request }) => {
  const sw = await request.get('/sw.js');
  expect(sw.headers()['cache-control']).toBe('no-cache');

  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.headers()['content-type']).toContain(
    'application/manifest+json',
  );

  const html = await (await request.get('/')).text();
  const asset = html.match(/\/assets\/[^"]+\.js/)?.[0];
  const res = await request.get(asset!);
  expect(res.headers()['cache-control']).toBe(
    'public, max-age=31536000, immutable',
  );
});

test('el proxy /api llega a la API', async ({ request }) => {
  expect(await (await request.get('/api/v1/health')).json()).toEqual({
    status: 'ok',
  });
});

// Solo nginx hace fallback a index.html. En Vercel no se hace a propósito: una ruta inexistente
// debe dar 404 y no un 200 con HTML (soft 404), que confunde a PWABuilder y a Lighthouse.
test('nginx: las rutas desconocidas caen en index.html', async ({
  request,
}) => {
  test.skip(!process.env.SPA_FALLBACK, 'solo aplica al contenedor nginx');
  const spa = await request.get('/ruta/inexistente');
  expect(spa.status()).toBe(200);
  expect(await spa.text()).toContain('<div id="root">');
});

test('una ruta inexistente responde 404 y no un 200 con HTML', async ({
  request,
}) => {
  test.skip(!!process.env.SPA_FALLBACK, 'nginx hace fallback a propósito');
  expect((await request.get('/service-worker.js')).status()).toBe(404);
});

test('cabeceras de seguridad (RNF-04)', async ({ request }) => {
  for (const path of ['/', '/sw.js', '/manifest.webmanifest']) {
    const h = (await request.get(path)).headers();
    expect(h['x-content-type-options'], path).toBe('nosniff');
    expect(h['x-frame-options'], path).toBe('DENY');
    expect(h['referrer-policy'], path).toBeTruthy();
    expect(h['strict-transport-security'], path).toContain('max-age=');
    expect(h['content-security-policy'], path).toContain("default-src 'self'");
    expect(h['content-security-policy'], path).toContain(
      "frame-ancestors 'none'",
    );
  }
});

test('la CSP no bloquea nada durante un flujo real', async ({
  page,
  context,
}) => {
  const problems: string[] = [];
  page.on(
    'console',
    (m) => /Content Security Policy/i.test(m.text()) && problems.push(m.text()),
  );
  page.on('pageerror', (e) => problems.push(e.message));
  // Una violación capturada por el código (p. ej. un `new Function` dentro de un try/catch) no
  // sale en la consola, pero sí en el panel Issues de Chrome, y Lighthouse la penaliza.
  const cdp = await context.newCDPSession(page);
  cdp.on('Audits.issueAdded', ({ issue }) => {
    if (issue.code === 'ContentSecurityPolicyIssue') {
      problems.push(JSON.stringify(issue.details));
    }
  });
  await cdp.send('Audits.enable');

  await page.goto('/');
  await page
    .getByLabel('Correo')
    .fill(process.env.DEMO_EMAIL ?? 'tecnico@fieldreport.test');
  await page
    .getByLabel('Contraseña')
    .fill(process.env.DEMO_PASSWORD ?? 'demo1234');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.getByRole('link', { name: 'Nuevo reporte' }).click();
  await page.getByLabel('Cliente').fill('CSP-check');
  await page.getByLabel('Descripción').fill('Comprobación de la política CSP');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByRole('link', { name: /CSP-check/ })).toBeVisible();

  expect(problems).toEqual([]);
  // Limpieza: el reporte se sincroniza solo; se borra del servidor.
  const login = await page.request.post('/api/v1/auth/login', {
    data: {
      email: process.env.DEMO_EMAIL ?? 'tecnico@fieldreport.test',
      password: process.env.DEMO_PASSWORD ?? 'demo1234',
    },
  });
  const headers = {
    Authorization: `Bearer ${(await login.json()).accessToken}`,
  };
  await expect(page.getByText('Sincronizado', { exact: true })).toBeVisible({
    timeout: 10_000,
  });
  const { items } = await (
    await page.request.get('/api/v1/reports?limit=100', { headers })
  ).json();
  for (const r of items.filter(
    (r: { customerName: string }) => r.customerName === 'CSP-check',
  )) {
    await page.request.delete(`/api/v1/reports/${r.id}`, { headers });
  }
});

test.describe('offline.html', () => {
  // Sin SW: así se pide el archivo tal cual lo sirve nginx, no el shell de la SPA.
  test.use({ serviceWorkers: 'block' });

  test('conserva sus estilos bajo la CSP', async ({ page }) => {
    const violations: string[] = [];
    page.on(
      'console',
      (m) =>
        /Content Security Policy/i.test(m.text()) && violations.push(m.text()),
    );
    await page.goto('/offline.html');
    await expect(
      page.getByRole('heading', { name: 'Sin conexión' }),
    ).toBeVisible();
    const bg = await page
      .getByRole('link', { name: 'Volver a FieldReport' })
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe('rgb(15, 118, 110)');
    expect(violations).toEqual([]);
  });
});
