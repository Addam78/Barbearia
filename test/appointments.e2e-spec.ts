import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Appointments (e2e)', () => {
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

  async function getBarber() {
    const hashedPassword = await bcrypt.hash('123456', 8);
    const barber = await prisma.user.create({
      data: {
        name: 'Barbeiro',
        email: 'barbeiro.teste@example.com',
        password: hashedPassword,
        role: 'BARBER',
      },
    });

    const barberLogin = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'barbeiro.teste@example.com',
      password: '123456',
    });

    return { accessToken: barberLogin.body.accessToken, barberId: barber.id };
  }

  async function getClient() {
    const clientRegisterResponse = await request(app.getHttpServer()).post('/auth/register').send({
      name: 'Cliente',
      email: 'cliente.teste@example.com',
      password: '123456',
    });

    return clientRegisterResponse.body.id;
  }

  test('[POST] /appointments -com token', async () => {
    const { accessToken, barberId } = await getBarber();
    const clientId = await getClient();

    const serviceResponse = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

    const response = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        clientId,
        barberId,
        serviceId: serviceResponse.body.id,
        scheduledAt: '2026-09-25T09:00:00.000Z',
      });

    expect(response.statusCode).toBe(201);
  });

  test('[POST] /appointments -com token - horário indisponível', async () => {
    const { accessToken, barberId } = await getBarber();
    const clientId = await getClient();

    const serviceResponse = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

    await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        clientId,
        barberId,
        serviceId: serviceResponse.body.id,
        scheduledAt: '2026-09-25T09:00:00.000Z',
      });

    const response = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        clientId,
        barberId,
        serviceId: serviceResponse.body.id,
        scheduledAt: '2026-09-25T09:15:00.000Z',
      });

    expect(response.statusCode).toBe(409);
  });

  test('[GET] /appointments/:id -com token - id inexistente', async () => {
    const { accessToken } = await getBarber();

    const response = await request(app.getHttpServer())
      .get('/appointments/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.statusCode).toBe(404);
  });

  test('[PATCH] /appointments/:id -com token - altera status', async () => {
    const { accessToken, barberId } = await getBarber();
    const clientId = await getClient();

    const serviceResponse = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

    const createResponse = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        clientId,
        barberId,
        serviceId: serviceResponse.body.id,
        scheduledAt: '2026-09-25T09:00:00.000Z',
      });

    const response = await request(app.getHttpServer())
      .patch(`/appointments/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'COMPLETED' });

    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('COMPLETED');
  });

  test('[DELETE] /appointments/:id -com token', async () => {
    const { accessToken, barberId } = await getBarber();
    const clientId = await getClient();

    const serviceResponse = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

    const createResponse = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        clientId,
        barberId,
        serviceId: serviceResponse.body.id,
        scheduledAt: '2026-09-25T09:00:00.000Z',
      });

    const response = await request(app.getHttpServer())
      .delete(`/appointments/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.statusCode).toBe(200);

    const findAfterDelete = await request(app.getHttpServer())
      .get(`/appointments/${createResponse.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(findAfterDelete.statusCode).toBe(404);
  });

  describe('controle de acesso do CLIENT', () => {
    async function registerClient(email: string) {
      const registerResponse = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: 'Cliente', email, password: '123456' });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: '123456' });

      return { clientId: registerResponse.body.id, accessToken: loginResponse.body.accessToken };
    }

    async function createAppointmentAsBarber(
      barberToken: string,
      barberId: string,
      clientId: string,
      serviceId: string,
      scheduledAt: string,
    ) {
      const response = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${barberToken}`)
        .send({ clientId, barberId, serviceId, scheduledAt });

      return response.body;
    }

    async function setup() {
      const barber = await getBarber();
      const clientA = await registerClient('cliente.a@example.com');
      const clientB = await registerClient('cliente.b@example.com');

      const serviceResponse = await request(app.getHttpServer())
        .post('/services')
        .set('Authorization', `Bearer ${barber.accessToken}`)
        .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

      return { barber, clientA, clientB, serviceId: serviceResponse.body.id };
    }

    test('[POST] /appointments -CLIENT agenda para si mesmo, ignorando o clientId enviado', async () => {
      const { barber, clientA, clientB, serviceId } = await setup();

      const response = await request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${clientA.accessToken}`)
        .send({
          clientId: clientB.clientId,
          barberId: barber.barberId,
          serviceId,
          scheduledAt: '2026-09-25T09:00:00.000Z',
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.clientId).toBe(clientA.clientId);
    });

    test('[GET] /appointments -CLIENT lista só os próprios agendamentos', async () => {
      const { barber, clientA, clientB, serviceId } = await setup();

      await createAppointmentAsBarber(barber.accessToken, barber.barberId, clientA.clientId, serviceId, '2026-09-25T09:00:00.000Z');
      await createAppointmentAsBarber(barber.accessToken, barber.barberId, clientB.clientId, serviceId, '2026-09-25T10:00:00.000Z');

      const response = await request(app.getHttpServer())
        .get('/appointments')
        .set('Authorization', `Bearer ${clientA.accessToken}`);

      expect(response.statusCode).toBe(200);
      expect(response.body.total).toBe(1);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].clientId).toBe(clientA.clientId);
    });

    test('[GET] /appointments/:id -CLIENT não vê o agendamento de outro cliente', async () => {
      const { barber, clientA, clientB, serviceId } = await setup();

      const appointmentOfB = await createAppointmentAsBarber(
        barber.accessToken, barber.barberId, clientB.clientId, serviceId, '2026-09-25T09:00:00.000Z',
      );

      const response = await request(app.getHttpServer())
        .get(`/appointments/${appointmentOfB.id}`)
        .set('Authorization', `Bearer ${clientA.accessToken}`);

      expect(response.statusCode).toBe(404);
    });

    test('[DELETE] /appointments/:id -CLIENT não remove o agendamento de outro cliente', async () => {
      const { barber, clientA, clientB, serviceId } = await setup();

      const appointmentOfB = await createAppointmentAsBarber(
        barber.accessToken, barber.barberId, clientB.clientId, serviceId, '2026-09-25T09:00:00.000Z',
      );

      const response = await request(app.getHttpServer())
        .delete(`/appointments/${appointmentOfB.id}`)
        .set('Authorization', `Bearer ${clientA.accessToken}`);

      expect(response.statusCode).toBe(404);

      const stillThere = await request(app.getHttpServer())
        .get(`/appointments/${appointmentOfB.id}`)
        .set('Authorization', `Bearer ${clientB.accessToken}`);

      expect(stillThere.statusCode).toBe(200);
    });
  });
});
