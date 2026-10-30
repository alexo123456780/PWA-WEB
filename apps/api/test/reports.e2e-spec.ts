import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma.service.js';
import { configureApp } from '../src/setup.js';

const report = (over = {}) => ({
  clientId: randomUUID(),
  customerName: 'Granja El Sol',
  serviceType: 'REPAIR',
  description: 'Bomba de agua sin presión',
  createdAtClient: new Date().toISOString(),
  ...over,
});

describe('Reports API', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let auth: [string, string];
  const created: string[] = [];

  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = mod.createNestApplication();
    configureApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: process.env.DEMO_EMAIL,
        password: process.env.DEMO_PASSWORD,
      })
      .expect(200);
    auth = ['Authorization', `Bearer ${res.body.accessToken}`];
  });

  afterAll(async () => {
    await prisma.report.deleteMany({ where: { clientId: { in: created } } });
    await app.close();
  });

  const http = () => request(app.getHttpServer());
  const post = (body: object) => {
    const clientId = (body as { clientId?: string }).clientId;
    if (clientId) created.push(clientId);
    return http()
      .post('/api/v1/reports')
      .set(...auth)
      .send(body);
  };

  it('health responde ok', () =>
    http().get('/api/v1/health').expect(200, { status: 'ok' }));

  it('rechaza credenciales inválidas y peticiones sin token', async () => {
    await http()
      .post('/api/v1/auth/login')
      .send({ email: process.env.DEMO_EMAIL, password: 'mala' })
      .expect(401);
    await http().get('/api/v1/reports').expect(401);
  });

  it('crea un reporte (201) y es idempotente por clientId (200, sin duplicar)', async () => {
    const body = report();
    const first = await post(body).expect(201);
    const second = await post(body).expect(200);

    expect(second.body.id).toBe(first.body.id);
    expect(
      await prisma.report.count({ where: { clientId: body.clientId } }),
    ).toBe(1);
  });

  it('no duplica con reintentos concurrentes del mismo clientId', async () => {
    const body = report();
    const results = await Promise.all([post(body), post(body), post(body)]);

    expect(results.map((r) => r.status).sort()).toEqual([200, 200, 201]);
    expect(
      await prisma.report.count({ where: { clientId: body.clientId } }),
    ).toBe(1);
  });

  it('valida la entrada (400) y limita el tamaño del body (413)', async () => {
    const bad = await post(
      report({ customerName: 'x', serviceType: 'NOPE' }),
    ).expect(400);
    expect(bad.body.message).toHaveLength(2);

    await post(report({ description: 'a'.repeat(200_000) })).expect(413);
  });

  it('lista con filtro por estatus, lee, edita y elimina', async () => {
    const { body: r } = await post(report({ status: 'IN_PROGRESS' })).expect(
      201,
    );

    const list = await http()
      .get('/api/v1/reports?status=IN_PROGRESS&limit=100')
      .set(...auth)
      .expect(200);
    expect(list.body.items.some((i: { id: string }) => i.id === r.id)).toBe(
      true,
    );

    await http()
      .get(`/api/v1/reports/${r.id}`)
      .set(...auth)
      .expect(200);

    const upd = await http()
      .put(`/api/v1/reports/${r.id}`)
      .set(...auth)
      .send({ status: 'DONE' })
      .expect(200);
    expect(upd.body.status).toBe('DONE');

    await http()
      .delete(`/api/v1/reports/${r.id}`)
      .set(...auth)
      .expect(204);
    await http()
      .get(`/api/v1/reports/${r.id}`)
      .set(...auth)
      .expect(404);
  });
});
