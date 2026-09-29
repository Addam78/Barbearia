import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('Users (e2e)', () => {
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

  test('[GET] /users - sem token', async () => {
    const response = await request(app.getHttpServer()).get('/users');

    expect(response.statusCode).toBe(401);
  });

  test('[GET] /users -com token', async () => {
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
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
      .get('/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(registerResponse.body.id);
  });

  test('[GET] /users/:id -com token', async () => {
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
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
    const userId = registerResponse.body.id;

    const response = await request(app.getHttpServer())
      .get(`/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.email).toBe('barbeiro.teste@example.com');
  });

  test('[GET] /users/:id -com token - id inexistente', async () => {
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
      .get('/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.statusCode).toBe(404);
  });

  test('[PATCH] /users/:id -com token', async () => {
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
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
    const userId = registerResponse.body.id;

    const response = await request(app.getHttpServer())
      .patch(`/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Barbeiro Editado' });

    expect(response.statusCode).toBe(200);
    expect(response.body.name).toBe('Barbeiro Editado');
  });

  test('[DELETE] /users/:id -com token', async () => {
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
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
    const userId = registerResponse.body.id;

    const response = await request(app.getHttpServer())
      .delete(`/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(response.statusCode).toBe(200);

    const findAfterDelete = await request(app.getHttpServer())
      .get(`/users/${userId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(findAfterDelete.statusCode).toBe(404);
  });

  test('[POST] /users -com token de ADMIN - cria barbeiro', async () => {
    const hashedPassword = await bcrypt.hash('123456', 8);
    await prisma.user.create({
      data: {
        name: 'Admin',
        email: 'admin.teste@example.com',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });

    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'admin.teste@example.com',
      password: '123456',
    });

    const { accessToken } = loginResponse.body;

    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Barbeiro Novo',
        email: 'barbeiro.novo@example.com',
        password: '123456',
        role: 'BARBER',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.role).toBe('BARBER');
    expect(response.body.password).toBeUndefined();
  });

  test('[POST] /users -com token de CLIENT - acesso negado', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({
      name: 'Cliente',
      email: 'cliente.teste@example.com',
      password: '123456',
      role: 'CLIENT',
    });

    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'cliente.teste@example.com',
      password: '123456',
    });

    const { accessToken } = loginResponse.body;

    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        name: 'Barbeiro Novo',
        email: 'barbeiro.novo@example.com',
        password: '123456',
        role: 'BARBER',
      });

    expect(response.statusCode).toBe(403);
  });
});
