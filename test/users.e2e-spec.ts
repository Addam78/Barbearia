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
    await prisma.inviteToken.deleteMany();
    await prisma.user.deleteMany();
  });

  afterAll(async () => {
    await app.close();
  });

  async function createUser(role: 'CLIENT' | 'BARBER' | 'ADMIN', email: string) {
    const hashedPassword = await bcrypt.hash('123456', 8);
    const user = await prisma.user.create({
      data: { name: role, email, password: hashedPassword, role },
    });

    const loginResponse = await request(app.getHttpServer()).post('/auth/login').send({
      email,
      password: '123456',
    });

    return { id: user.id, accessToken: loginResponse.body.accessToken as string };
  }

  test('[GET] /users - sem token', async () => {
    const response = await request(app.getHttpServer()).get('/users');

    expect(response.statusCode).toBe(401);
  });

  test('[GET] /users -com token de BARBER', async () => {
    const barber = await createUser('BARBER', 'barbeiro.teste@example.com');

    const response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${barber.accessToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].id).toBe(barber.id);
  });

  test('[GET] /users -com token de ADMIN', async () => {
    const admin = await createUser('ADMIN', 'admin.teste@example.com');

    const response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.data[0].password).toBeUndefined();
  });

  test('[GET] /users -com token de CLIENT - acesso negado', async () => {
    const client = await createUser('CLIENT', 'cliente.teste@example.com');

    const response = await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${client.accessToken}`);

    expect(response.statusCode).toBe(403);
  });

  test('[GET] /users/:id -CLIENT consulta a própria conta', async () => {
    const client = await createUser('CLIENT', 'cliente.teste@example.com');

    const response = await request(app.getHttpServer())
      .get(`/users/${client.id}`)
      .set('Authorization', `Bearer ${client.accessToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.email).toBe('cliente.teste@example.com');
  });

  test('[GET] /users/:id -CLIENT não consulta outro usuário', async () => {
    const client = await createUser('CLIENT', 'cliente.teste@example.com');
    const barber = await createUser('BARBER', 'barbeiro.teste@example.com');

    const response = await request(app.getHttpServer())
      .get(`/users/${barber.id}`)
      .set('Authorization', `Bearer ${client.accessToken}`);

    expect(response.statusCode).toBe(403);
  });

  test('[GET] /users/:id -BARBER consulta outro usuário', async () => {
    const barber = await createUser('BARBER', 'barbeiro.teste@example.com');
    const client = await createUser('CLIENT', 'cliente.teste@example.com');

    const response = await request(app.getHttpServer())
      .get(`/users/${client.id}`)
      .set('Authorization', `Bearer ${barber.accessToken}`);

    expect(response.statusCode).toBe(200);
    expect(response.body.email).toBe('cliente.teste@example.com');
  });

  test('[GET] /users/:id -com token - id inexistente', async () => {
    const admin = await createUser('ADMIN', 'admin.teste@example.com');

    const response = await request(app.getHttpServer())
      .get('/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${admin.accessToken}`);

    expect(response.statusCode).toBe(404);
  });

  test('[PATCH] /users/:id -com token', async () => {
    const barber = await createUser('BARBER', 'barbeiro.teste@example.com');

    const response = await request(app.getHttpServer())
      .patch(`/users/${barber.id}`)
      .set('Authorization', `Bearer ${barber.accessToken}`)
      .send({ name: 'Barbeiro Editado' });

    expect(response.statusCode).toBe(200);
    expect(response.body.name).toBe('Barbeiro Editado');
  });

  test('[DELETE] /users/:id -com token', async () => {
    const barber = await createUser('BARBER', 'barbeiro.teste@example.com');

    const response = await request(app.getHttpServer())
      .delete(`/users/${barber.id}`)
      .set('Authorization', `Bearer ${barber.accessToken}`);

    expect(response.statusCode).toBe(200);

    const findAfterDelete = await request(app.getHttpServer())
      .get(`/users/${barber.id}`)
      .set('Authorization', `Bearer ${barber.accessToken}`);

    expect(findAfterDelete.statusCode).toBe(404);
  });

  test('[POST] /users -com token de ADMIN - cria barbeiro', async () => {
    const admin = await createUser('ADMIN', 'admin.teste@example.com');

    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${admin.accessToken}`)
      .send({
        name: 'Barbeiro Novo',
        email: 'barbeiro.novo@example.com',
        role: 'BARBER',
      });

    expect(response.statusCode).toBe(201);
    expect(response.body.role).toBe('BARBER');
    expect(response.body.password).toBeUndefined();
  });

  test('[POST] /users -com token de CLIENT - acesso negado', async () => {
    const client = await createUser('CLIENT', 'cliente.teste@example.com');

    const response = await request(app.getHttpServer())
      .post('/users')
      .set('Authorization', `Bearer ${client.accessToken}`)
      .send({
        name: 'Barbeiro Novo',
        email: 'barbeiro.novo@example.com',
        role: 'BARBER',
      });

    expect(response.statusCode).toBe(403);
  });
});
