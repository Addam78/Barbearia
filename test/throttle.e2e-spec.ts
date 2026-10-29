import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

// Nos demais e2e o limite de requisições fica desligado (dezenas de logins partem do mesmo IP).
// Aqui ele é ligado de propósito, só para este arquivo.
describe('Limite de tentativas (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    process.env.THROTTLE_E2E = '1';

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
    delete process.env.THROTTLE_E2E;
    await app.close();
  });

  test('[POST] /auth/login -10 tentativas passam (401), a 11ª é barrada com 429', async () => {
    const attempt = () =>
      request(app.getHttpServer()).post('/auth/login').send({ email: 'ninguem@example.com', password: 'errada123' });

    for (let i = 0; i < 10; i++) {
      const response = await attempt();
      expect(response.statusCode).toBe(401);
    }

    const blocked = await attempt();
    expect(blocked.statusCode).toBe(429);
  });

  test('[POST] /auth/register -5 cadastros passam, o 6º é barrado com 429', async () => {
    const register = (n: number) =>
      request(app.getHttpServer())
        .post('/auth/register')
        .send({ name: `Cliente ${n}`, email: `cliente${n}@example.com`, password: '123456' });

    for (let i = 1; i <= 5; i++) {
      const response = await register(i);
      expect(response.statusCode).toBe(201);
    }

    const blocked = await register(6);
    expect(blocked.statusCode).toBe(429);
  });

  test('[GET] /health -nunca é barrado, mesmo com muitas chamadas seguidas', async () => {
    for (let i = 0; i < 120; i++) {
      const response = await request(app.getHttpServer()).get('/health');
      expect(response.statusCode).toBe(200);
    }
  });
});
