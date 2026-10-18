import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma/client.js';
import bcrypt from 'bcryptjs';

// Seed de PRODUÇÃO: cria só clientes de demonstração.
//  - NÃO cria admin: o admin é criado à mão no banco (veja SETUP.md).
//  - NÃO cria barbeiros: barbeiro enxerga a lista de usuários (e-mails de clientes reais) e edita
//    serviços, então entra pelo convite (o admin cria em POST /users e a pessoa define a própria senha).
//  - NÃO tem senha fixa: a senha de todos vem de SEED_PASSWORD, que você define ao rodar:
//        SEED_PASSWORD='uma-senha-forte' pnpm seed:prod
//    (a senha 123456 do seed de desenvolvimento é pública, está no repositório).
//  - Usa upsert sem sobrescrever: rodar de novo não redefine a senha de quem já existe.
const MIN_PASSWORD_LENGTH = 10;

const password = process.env.SEED_PASSWORD ?? '';

if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(
    `Defina SEED_PASSWORD com pelo menos ${MIN_PASSWORD_LENGTH} caracteres. Exemplo: SEED_PASSWORD='uma-senha-forte' pnpm seed:prod`,
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const demoUsers = [
  { name: 'João Cliente', email: 'cliente1@barbearia.com', role: 'CLIENT' as const },
  { name: 'Maria Cliente', email: 'cliente2@barbearia.com', role: 'CLIENT' as const },
];

async function main() {
  const hashedPassword = await bcrypt.hash(password, 10);

  for (const user of demoUsers) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, password: hashedPassword },
    });
  }

  console.log('Seed de produção concluído (sem admin). Usuários:', demoUsers.map((user) => `${user.role} ${user.email}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
