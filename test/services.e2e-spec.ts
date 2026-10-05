import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Services (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    prisma = moduleRef.get(PrismaService);
    await app.init();
  });

  beforeEach(async () => {
    await prisma.appointment.deleteMany();
    await prisma.service.deleteMany();
    await prisma.inviteToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function getToken(role: 'CLIENT' | 'BARBER' | 'ADMIN', email: string) {
    const hashedPassword = await bcrypt.hash('123456', 8);
    await prisma.user.create({
      data: { name: role, email, password: hashedPassword, role },
    });

    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email,
      password: '123456',
    });

    return loginResponse.body.accessToken as string;
  }

  const getBarberToken = () => getToken('BARBER', 'barbeiro.teste@example.com');
  const getClientToken = () => getToken('CLIENT', 'cliente.teste@example.com');

  async function createService(accessToken: string, name = 'Corte simples') {
    const response = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name, price: 20, durationMinutes: 30 });

    return response.body.id as string;
  }

  test('[POST] /services -CLIENT - acesso negado', async () => {
    const clientToken = await getClientToken();

    const response = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

    expect(response.statusCode).toBe(403);
  });

  test('[PATCH] /services -com token', async () => {
    const accessToken = await getBarberToken();
    const serviceId = await createService(accessToken);

    const response = await request(app.getHttpServer())
      .patch(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte americano' });

    expect(response.statusCode).toBe(200);
    expect(response.body.name).toBe('Corte americano');
  });

  test('[PATCH] /services -CLIENT - acesso negado', async () => {
    const barberToken = await getBarberToken();
    const clientToken = await getClientToken();
    const serviceId = await createService(barberToken);

    const response = await request(app.getHttpServer())
      .patch(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ name: 'Corte na maxima' });

    expect(response.statusCode).toBe(403);
  });

  test('[GET] /services/:id -com token', async () => {
    const accessToken = await getBarberToken();
    const serviceId = await createService(accessToken);

    const response = await request(app.getHttpServer())
      .get(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.name).toBe('Corte simples');
    expect(response.body.active).toBe(true);
  });

  test('[GET] /services/:id -com token - id inexistente', async () => {
    const accessToken = await getBarberToken();

    const response = await request(app.getHttpServer())
      .get('/services/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.statusCode).toBe(404);
  });

  test('[DELETE] /services/:id -não existe mais, serviço é desativado e não apagado', async () => {
    const accessToken = await getBarberToken();
    const serviceId = await createService(accessToken);

    const response = await request(app.getHttpServer())
      .delete(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.statusCode).toBe(404);

    const stillThere = await request(app.getHttpServer())
      .get(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(stillThere.statusCode).toBe(200);
  });

  test('[PATCH] /services/:id -desativa e reativa o serviço', async () => {
    const accessToken = await getBarberToken();
    const serviceId = await createService(accessToken);

    const deactivate = await request(app.getHttpServer())
      .patch(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ active: false });

    expect(deactivate.statusCode).toBe(200);
    expect(deactivate.body.active).toBe(false);

    const reactivate = await request(app.getHttpServer())
      .patch(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ active: true });

    expect(reactivate.statusCode).toBe(200);
    expect(reactivate.body.active).toBe(true);
  });

  test('[GET] /services -CLIENT vê só os ativos; BARBER vê todos', async () => {
    const barberToken = await getBarberToken();
    const clientToken = await getClientToken();

    await createService(barberToken, 'Corte simples');
    const inactiveId = await createService(barberToken, 'Corte antigo');

    await request(app.getHttpServer())
      .patch(`/services/${inactiveId}`)
      .set('Authorization', `Bearer ${barberToken}`)
      .send({ active: false });

    const clientList = await request(app.getHttpServer())
      .get('/services')
      .set('Authorization', `Bearer ${clientToken}`);

    expect(clientList.statusCode).toBe(200);
    expect(clientList.body.total).toBe(1);
    expect(clientList.body.data[0].name).toBe('Corte simples');

    const barberList = await request(app.getHttpServer())
      .get('/services')
      .set('Authorization', `Bearer ${barberToken}`);

    expect(barberList.body.total).toBe(2);
  });

  test('[GET] /services/:id -serviço desativado: CLIENT recebe 404, BARBER consulta normalmente', async () => {
    const barberToken = await getBarberToken();
    const clientToken = await getClientToken();
    const serviceId = await createService(barberToken);

    await request(app.getHttpServer())
      .patch(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${barberToken}`)
      .send({ active: false });

    const asClient = await request(app.getHttpServer())
      .get(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${clientToken}`);

    expect(asClient.statusCode).toBe(404);

    const asBarber = await request(app.getHttpServer())
      .get(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${barberToken}`);

    expect(asBarber.statusCode).toBe(200);
  });

  test('[POST] /services -nome de um serviço desativado - conflito', async () => {
    const accessToken = await getBarberToken();
    const serviceId = await createService(accessToken);

    await request(app.getHttpServer())
      .patch(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ active: false });

    const response = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

    expect(response.statusCode).toBe(409);
    expect(response.body.message).toContain('desativado');
  });
});
