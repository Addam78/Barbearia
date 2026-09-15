import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Auth (e2e)', () => {
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
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  test('[POST] /auth/register', async () => {
    const response = await request(app.getHttpServer()).post('/auth/register').send({
      name: 'João',
      email: 'joao.teste@example.com',
      password: '123456',
      role: 'BARBER',
    });

    expect(response.statusCode).toBe(201);
    
  });

  test('[POST] /auth/login', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({
      name: 'Maria',
      email: 'maria.teste@example.com',
      password: '123456',
      role: 'CLIENT',
    });

    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'maria.teste@example.com',
      password: '123456',
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('accessToken');
  });

  test('[GET] /users/ola - sem token', async () => {
    const response = await request(app.getHttpServer()).get('/users/ola');

    expect(response.statusCode).toBe(401);
  });


  test('[GET] /users/ola -com token', async () => {
      await request(app.getHttpServer()).post('/auth/register').send({
    name: 'Hudsos Marques',
    email: 'protegido.teste@example.com',
    password: '123456',
    role: 'CLIENT',
  });

  const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
    email: 'protegido.teste@example.com',
    password: '123456',
  });

  const { accessToken } = loginResponse.body;

  const response = await request(app.getHttpServer())
    .get('/users/ola')
    .set('Authorization', `Bearer ${accessToken}`);

  expect(response.statusCode).toBe(200);
});

test('[PATCH] /services -com token', async () => {
  // 1. login pra ter token (mesmo padrão do teste anterior)
  await request(app.getHttpServer()).post('/auth/register').send({
    name: 'Barbeiro',
    email: 'barbeiro.teste@example.com',
    password: '123456',
    role: 'BARBER',
  });

  const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
    email: 'barbeiro.teste@example.com',
    password: '123456',
  });

  const { accessToken } = loginResponse.body;

  // 2. cria um serviço pra ter o que atualizar
  const createResponse = await request(app.getHttpServer())
    .post('/services')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Corte simples', price: 20, durationMinutes: 30 });

  const serviceId = createResponse.body.id;

  // 3. atualiza
  const response = await request(app.getHttpServer())
    .patch(`/services/${serviceId}`)
    .set('Authorization', `Bearer ${accessToken}`)
    .send({ name: 'Corte americano' });

  expect(response.statusCode).toBe(200);
  expect(response.body.name).toBe('Corte americano');
});

test('[GET] /services/:id -com token', async () => {
  await request(app.getHttpServer()).post('/auth/register').send({
    name: 'Barbeiro',
    email: 'barbeiro.teste@example.com',
    password: '123456',
    role: 'BARBER',
  });

  const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
    email: 'barbeiro.teste@example.com',
    password: '123456',
  });

  const { accessToken } = loginResponse.body;

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
  await request(app.getHttpServer()).post('/auth/register').send({
    name: 'Barbeiro',
    email: 'barbeiro.teste@example.com',
    password: '123456',
    role: 'BARBER',
  });

  const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
    email: 'barbeiro.teste@example.com',
    password: '123456',
  });

  const { accessToken } = loginResponse.body;

  const response = await request(app.getHttpServer())
    .get('/services/00000000-0000-0000-0000-000000000000')
    .set('Authorization', `Bearer ${accessToken}`);

  expect(response.statusCode).toBe(404);
});

test('[DELETE] /services -com token', async () => {
  await request(app.getHttpServer()).post('/auth/register').send({
    name: 'Barbeiro',
    email: 'barbeiro.teste@example.com',
    password: '123456',
    role: 'BARBER',
  });

  const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
    email: 'barbeiro.teste@example.com',
    password: '123456',
  });

  const { accessToken } = loginResponse.body;

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

  expect(findAfterDelete.body.searchServices).toEqual([]);
});

})