import { PrismaClient } from '../src/generated/prisma/client.js';
import bcrypt from 'bcryptjs';

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

  console.log({ admin, barber1, barber2, client1, client2, service1, service2 });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
