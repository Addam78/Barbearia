import { PrismaClient } from '../src/generated/prisma/client.js';
import bcrypt from 'bcryptjs';

// Seed de DESENVOLVIMENTO, para quem clona o projeto: cria admin, barbeiros, clientes e serviços
// de exemplo, todos com a senha fixa e PÚBLICA 123456. Por isso nunca pode rodar em produção:
//  - recusa NODE_ENV=production;
//  - recusa qualquer banco que não seja local (localhost/127.0.0.1), a não ser com SEED_ALLOW_REMOTE=1.
// Em produção use `pnpm seed:prod` (sem admin e sem senha fixa) e crie o seu admin à mão (veja SETUP.md).
function assertSafeToSeed() {
  if (process.env.NODE_ENV === 'production') {
    console.error(
      'Seed recusado: NODE_ENV=production. Este seed cria usuários com senha fixa e pública (123456). Em produção use "pnpm seed:prod".',
    );
    process.exit(1);
  }

  let host = '';
  try {
    host = new URL(process.env.DATABASE_URL ?? '').hostname;
  } catch {
    // sem DATABASE_URL válida: o próprio Prisma acusa o erro mais adiante
  }

  const isLocal = ['localhost', '127.0.0.1', '::1', '[::1]'].includes(host);
  if (host && !isLocal && process.env.SEED_ALLOW_REMOTE !== '1') {
    console.error(
      `Seed recusado: o banco (${host}) não é local, e este seed cria usuários com senha pública (123456). Se tem certeza de que é um banco de desenvolvimento, rode com SEED_ALLOW_REMOTE=1.`,
    );
    process.exit(1);
  }
}

assertSafeToSeed();

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash('123456', 8);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@barbearia.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@barbearia.com',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  const barber1 = await prisma.user.upsert({
    where: { email: 'barbeiro1@barbearia.com' },
    update: {},
    create: {
      name: 'Carlos Barbeiro',
      email: 'barbeiro1@barbearia.com',
      password: hashedPassword,
      role: 'BARBER',
    },
  });

  const barber2 = await prisma.user.upsert({
    where: { email: 'barbeiro2@barbearia.com' },
    update: {},
    create: {
      name: 'Marcos Barbeiro',
      email: 'barbeiro2@barbearia.com',
      password: hashedPassword,
      role: 'BARBER',
    },
  });

  const client1 = await prisma.user.upsert({
    where: { email: 'cliente1@barbearia.com' },
    update: {},
    create: {
      name: 'João Cliente',
      email: 'cliente1@barbearia.com',
      password: hashedPassword,
      role: 'CLIENT',
    },
  });

  const client2 = await prisma.user.upsert({
    where: { email: 'cliente2@barbearia.com' },
    update: {},
    create: {
      name: 'Maria Cliente',
      email: 'cliente2@barbearia.com',
      password: hashedPassword,
      role: 'CLIENT',
    },
  });

  const service1 = await prisma.service.upsert({
    where: { name: 'Corte simples' },
    update: {},
    create: {
      name: 'Corte simples',
      price: 30,
      durationMinutes: 30,
    },
  });

  const service2 = await prisma.service.upsert({
    where: { name: 'Corte + barba' },
    update: {},
    create: {
      name: 'Corte + barba',
      price: 50,
      durationMinutes: 50,
    },
  });

  console.log('Seed de desenvolvimento concluído (senha de todos os usuários: 123456).');
  console.log('Usuários:', [admin, barber1, barber2, client1, client2].map((user) => `${user.role} ${user.email}`));
  console.log('Serviços:', [service1, service2].map((service) => service.name));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
