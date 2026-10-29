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
    await prisma.refreshToken.deleteMany();
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
        scheduledAt: '2030-09-25T09:00:00.000Z',
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
        scheduledAt: '2030-09-25T09:00:00.000Z',
      });

    const response = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        clientId,
        barberId,
        serviceId: serviceResponse.body.id,
        scheduledAt: '2030-09-25T09:15:00.000Z',
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
        scheduledAt: '2030-09-25T09:00:00.000Z',
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
        scheduledAt: '2030-09-25T09:00:00.000Z',
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

  test('[POST] /appointments -serviço desativado - 400, e os agendamentos antigos continuam', async () => {
    const { accessToken, barberId } = await getBarber();
    const clientId = await getClient();

    const serviceResponse = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

    const serviceId = serviceResponse.body.id;

    const oldAppointment = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ clientId, barberId, serviceId, scheduledAt: '2030-09-25T09:00:00.000Z' });

    await request(app.getHttpServer())
      .patch(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ active: false });

    const newAppointment = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ clientId, barberId, serviceId, scheduledAt: '2030-09-25T10:00:00.000Z' });

    expect(newAppointment.statusCode).toBe(400);

    const stillThere = await request(app.getHttpServer())
      .get(`/appointments/${oldAppointment.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(stillThere.statusCode).toBe(200);
  });

  test('[POST] /appointments -horário que já passou - 400', async () => {
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
        scheduledAt: '2020-01-06T12:00:00.000Z',
      });

    expect(response.statusCode).toBe(400);
  });

  test('[POST] /appointments -cancelar libera o horário para outro cliente (índice parcial)', async () => {
    const { accessToken, barberId } = await getBarber();
    const clientId = await getClient();

    const serviceResponse = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

    const serviceId = serviceResponse.body.id;
    const scheduledAt = '2030-09-25T13:00:00.000Z';

    const first = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ clientId, barberId, serviceId, scheduledAt });

    expect(first.statusCode).toBe(201);

    const cancel = await request(app.getHttpServer())
      .patch(`/appointments/${first.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'CANCELLED' });

    expect(cancel.statusCode).toBe(200);

    // Mesmo barbeiro, mesmo horário: antes quebrava com erro de unicidade (500).
    const second = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ clientId, barberId, serviceId, scheduledAt });

    expect(second.statusCode).toBe(201);

    // Dois agendamentos ATIVOS no mesmo horário continuam bloqueados.
    const third = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ clientId, barberId, serviceId, scheduledAt });

    expect(third.statusCode).toBe(409);
  });

  test('[PATCH] /appointments/:id -reativar cancelado cujo horário foi ocupado - 409', async () => {
    const { accessToken, barberId } = await getBarber();
    const clientId = await getClient();

    const serviceResponse = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

    const serviceId = serviceResponse.body.id;
    const scheduledAt = '2030-09-25T14:00:00.000Z';

    const first = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ clientId, barberId, serviceId, scheduledAt });

    await request(app.getHttpServer())
      .patch(`/appointments/${first.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'CANCELLED' });

    await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ clientId, barberId, serviceId, scheduledAt });

    const reactivate = await request(app.getHttpServer())
      .patch(`/appointments/${first.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'PENDING' });

    expect(reactivate.statusCode).toBe(409);
  });

  test('[PATCH] /appointments/:id -reativar cancelado com o horário livre - 409 (cancelado não volta)', async () => {
    const { accessToken, barberId } = await getBarber();
    const clientId = await getClient();

    const serviceResponse = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

    const created = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ clientId, barberId, serviceId: serviceResponse.body.id, scheduledAt: '2030-09-25T16:00:00.000Z' });

    await request(app.getHttpServer())
      .patch(`/appointments/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'CANCELLED' });

    const reactivate = await request(app.getHttpServer())
      .patch(`/appointments/${created.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'CONFIRMED' });

    expect(reactivate.statusCode).toBe(409);
  });

  test('[PATCH] /appointments/:id -reativar cancelado que se sobreporia a outro ativo (início diferente) - 409', async () => {
    const { accessToken, barberId } = await getBarber();
    const clientId = await getClient();

    const serviceResponse = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

    const serviceId = serviceResponse.body.id;

    // João às 10h00 (13h00 UTC), cancelado; depois Maria às 10h15, que cai dentro do intervalo do cancelado.
    const first = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ clientId, barberId, serviceId, scheduledAt: '2030-09-26T13:00:00.000Z' });

    await request(app.getHttpServer())
      .patch(`/appointments/${first.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'CANCELLED' });

    const overlapping = await request(app.getHttpServer())
      .post('/appointments')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ clientId, barberId, serviceId, scheduledAt: '2030-09-26T13:15:00.000Z' });

    expect(overlapping.statusCode).toBe(201);

    // Antes da correção, isto devolvia 200 e deixava dois agendamentos ativos sobrepostos.
    const reactivate = await request(app.getHttpServer())
      .patch(`/appointments/${first.body.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'PENDING' });

    expect(reactivate.statusCode).toBe(409);

    const list = await request(app.getHttpServer())
      .get('/appointments')
      .set('Authorization', `Bearer ${accessToken}`);

    const active = list.body.data.filter((appointment: { status: string }) => appointment.status !== 'CANCELLED');
    expect(active).toHaveLength(1);
  });

  test('[POST] /appointments -duas reservas simultâneas no mesmo horário: uma 201, outra 409 (nunca 500)', async () => {
    const { accessToken, barberId } = await getBarber();
    const clientId = await getClient();

    const serviceResponse = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

    const body = {
      clientId,
      barberId,
      serviceId: serviceResponse.body.id,
      scheduledAt: '2030-09-25T15:00:00.000Z',
    };

    const send = () =>
      request(app.getHttpServer())
        .post('/appointments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(body);

    const [a, b] = await Promise.all([send(), send()]);
    const statuses = [a.statusCode, b.statusCode].sort();

    expect(statuses).toEqual([201, 409]);
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
          scheduledAt: '2030-09-25T09:00:00.000Z',
        });

      expect(response.statusCode).toBe(201);
      expect(response.body.clientId).toBe(clientA.clientId);
    });

    test('[GET] /appointments -CLIENT lista só os próprios agendamentos', async () => {
      const { barber, clientA, clientB, serviceId } = await setup();

      await createAppointmentAsBarber(barber.accessToken, barber.barberId, clientA.clientId, serviceId, '2030-09-25T09:00:00.000Z');
      await createAppointmentAsBarber(barber.accessToken, barber.barberId, clientB.clientId, serviceId, '2030-09-25T10:00:00.000Z');

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
        barber.accessToken, barber.barberId, clientB.clientId, serviceId, '2030-09-25T09:00:00.000Z',
      );

      const response = await request(app.getHttpServer())
        .get(`/appointments/${appointmentOfB.id}`)
        .set('Authorization', `Bearer ${clientA.accessToken}`);

      expect(response.statusCode).toBe(404);
    });

    test('[DELETE] /appointments/:id -CLIENT não remove o agendamento de outro cliente', async () => {
      const { barber, clientA, clientB, serviceId } = await setup();

      const appointmentOfB = await createAppointmentAsBarber(
        barber.accessToken, barber.barberId, clientB.clientId, serviceId, '2030-09-25T09:00:00.000Z',
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
