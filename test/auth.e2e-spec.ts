import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
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
    await prisma.inviteToken.deleteMany();
    await prisma.refreshToken.deleteMany();
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

  describe('[POST] /auth/accept-invite', () => {
    const email = 'barbeiro.convidado@example.com';

    // Reproduz o estado deixado por POST /users + worker: conta com senha aleatória
    // (ninguém conhece) e um InviteToken PENDING.
    async function createInvitedBarber(token = 'token-de-convite-valido') {
      const user = await prisma.user.create({
        data: {
          name: 'Barbeiro Convidado',
          email,
          password: await bcrypt.hash(randomBytes(32).toString('hex'), 8),
          role: 'BARBER',
        },
      });

      await prisma.inviteToken.create({ data: { token, userId: user.id } });
      return { user, token };
    }

    test('define a senha, deixa o convite como USED e permite o login', async () => {
      const { user, token } = await createInvitedBarber();

      const beforeAccept = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'minhaSenha123' });
      expect(beforeAccept.statusCode).toBe(401);

      const response = await request(app.getHttpServer())
        .post('/auth/accept-invite')
        .send({ token, password: 'minhaSenha123' });

      expect(response.statusCode).toBe(201);
      expect(response.body).toEqual({ message: 'Senha definida com sucesso' });

      const invite = await prisma.inviteToken.findUnique({ where: { token } });
      expect(invite?.status).toBe('USED');

      const login = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'minhaSenha123' });

      expect(login.statusCode).toBe(200);
      expect(login.body).toHaveProperty('accessToken');
      expect(login.body).toHaveProperty('refreshToken');

      const unchanged = await prisma.user.findUnique({ where: { id: user.id } });
      expect(unchanged?.role).toBe('BARBER');
    });

    test('o mesmo convite não pode ser usado duas vezes', async () => {
      const { token } = await createInvitedBarber();

      await request(app.getHttpServer())
        .post('/auth/accept-invite')
        .send({ token, password: 'primeiraSenha1' });

      const second = await request(app.getHttpServer())
        .post('/auth/accept-invite')
        .send({ token, password: 'outraSenha456' });

      expect(second.statusCode).toBe(401);

      // a segunda tentativa não troca a senha
      const oldPassword = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'primeiraSenha1' });
      expect(oldPassword.statusCode).toBe(200);

      const newPassword = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password: 'outraSenha456' });
      expect(newPassword.statusCode).toBe(401);
    });

    test('token inexistente retorna 401', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/accept-invite')
        .send({ token: 'token-que-nao-existe', password: 'minhaSenha123' });

      expect(response.statusCode).toBe(401);
    });

    test('senha curta retorna 400 e não consome o convite', async () => {
      const { token } = await createInvitedBarber();

      const response = await request(app.getHttpServer())
        .post('/auth/accept-invite')
        .send({ token, password: '123' });

      expect(response.statusCode).toBe(400);

      const invite = await prisma.inviteToken.findUnique({ where: { token } });
      expect(invite?.status).toBe('PENDING');
    });

    test('é pública: funciona sem Authorization', async () => {
      const { token } = await createInvitedBarber();

      const response = await request(app.getHttpServer())
        .post('/auth/accept-invite')
        .send({ token, password: 'minhaSenha123' });

      expect(response.statusCode).not.toBe(401);
      expect(response.statusCode).toBe(201);
    });
  });
});
