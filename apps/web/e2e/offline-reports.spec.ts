import { expect, test, type Page } from '@playwright/test';

const EMAIL = process.env.DEMO_EMAIL ?? 'tecnico@fieldreport.test';
const PASSWORD = process.env.DEMO_PASSWORD ?? 'demo1234';

// El técnico abre la app con red al menos una vez (PRD, supuestos): login y shell en caché.
async function loginWithNetwork(page: Page) {
  await page.goto('/');
  await page.getByLabel('Correo').fill(EMAIL);
  await page.getByLabel('Contraseña').fill(PASSWORD);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('link', { name: 'Nuevo reporte' })).toBeVisible();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
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

test('rechaza credenciales inválidas', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Correo').fill(EMAIL);
  await page.getByLabel('Contraseña').fill('incorrecta');
  await page.getByRole('button', { name: 'Entrar' }).click();
  await expect(page.getByRole('alert')).toHaveText(
    'Correo o contraseña incorrectos',
  );
});

test('valida el formulario con mensajes en español', async ({ page }) => {
  await loginWithNetwork(page);
  await page.getByRole('link', { name: 'Nuevo reporte' }).click();
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Escribe el nombre del cliente')).toBeVisible();
  await expect(page.getByText(/Describe el trabajo realizado/)).toBeVisible();
  await expect(page).toHaveURL(/#\/new$/);
});

test('crea, recarga, edita y elimina reportes sin conexión', async ({
  page,
  context,
}) => {
  await loginWithNetwork(page);
  await context.setOffline(true);

  await createReport(page, 'Granja El Sol');
  await createReport(page, 'Rancho Norte');
  await expect(page.getByText('Pendiente de sincronizar')).toHaveCount(2);
  await expect(page.getByText('2 reportes sin sincronizar')).toBeVisible();

  // Sin red, la app y los datos sobreviven a una recarga completa.
  await page.reload();
  await expect(page.getByRole('link', { name: /Granja El Sol/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Rancho Norte/ })).toBeVisible();

  await page.getByRole('link', { name: /Granja El Sol/ }).click();
  await page.getByRole('link', { name: 'Editar' }).click();
  await page.getByLabel('Cliente').fill('Granja La Luna');
  await page.getByRole('button', { name: 'Guardar' }).click();
  await expect(page.getByText('Granja La Luna')).toBeVisible();

  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: 'Eliminar' }).click();
  await expect(page.getByRole('link', { name: /Granja La Luna/ })).toHaveCount(
    0,
  );
  await expect(page.getByRole('link', { name: /Rancho Norte/ })).toBeVisible();
});
