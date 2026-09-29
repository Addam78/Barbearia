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
});
