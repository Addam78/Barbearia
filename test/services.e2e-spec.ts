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

  async function getBarberToken() {
    const hashedPassword = await bcrypt.hash('123456', 8);
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin.teste@example.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    const adminLogin = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'admin.teste@example.com',
      password: '123456',
    });

    await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${adminLogin.body.accessToken}`)
      .send({
        name: 'Barbeiro',
        email: 'barbeiro.teste@example.com',
        password: '123456',
        role: 'BARBER',
      });

    const barberLogin = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'barbeiro.teste@example.com',
      password: '123456',
    });

    return barberLogin.body.accessToken;
  }

  test('[PATCH] /services -com token', async () => {
    const accessToken = await getBarberToken();

    const createResponse = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

    const serviceId = createResponse.body.id;

    const response = await request(app.getHttpServer())
      .patch(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte americano' });

    expect(response.statusCode).toBe(200);
    expect(response.body.name).toBe('Corte americano');
  });

  test('[GET] /services/:id -com token', async () => {
    const accessToken = await getBarberToken();

    const createResponse = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

    const serviceId = createResponse.body.id;

    const response = await request(app.getHttpServer())
      .get(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.name).toBe('Corte simples');
  });

  test('[GET] /services/:id -com token - id inexistente', async () => {
    const accessToken = await getBarberToken();

    const response = await request(app.getHttpServer())
      .get('/services/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.statusCode).toBe(404);
  });

  test('[DELETE] /services -com token', async () => {
    const accessToken = await getBarberToken();

    const createResponse = await request(app.getHttpServer())
      .post('/services')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

    const serviceId = createResponse.body.id;

    const response = await request(app.getHttpServer())
      .delete(`/services/${serviceId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.statusCode).toBe(204);

    const findAfterDelete = await request(app.getHttpServer())
      .get('/services')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(findAfterDelete.body.data).toEqual([]);
  });
});
