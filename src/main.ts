import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });
  app.useLogger(app.get(Logger))

  app.enableCors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  });

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Barbearia API')
    .setDescription(`
## Introdução

API de agendamento para barbearia. Clientes marcam horário com um barbeiro para um serviço, e a API impede dois agendamentos sobrepostos para o mesmo barbeiro.

## Como autenticar

1. Crie sua conta de cliente em **POST /auth/register** (ou use um usuário que já exista).
2. Faça login em **POST /auth/login** e copie o \`accessToken\`.
3. Informe o token no campo de autenticação **Bearer** do Scalar. Ele é enviado no header \`Authorization: Bearer <token>\`.

Só \`/auth/register\`, \`/auth/login\` e \`/auth/accept-invite\` são públicas. Todas as outras exigem token.

## Perfis (roles)

| Perfil | O que pode fazer |
|---|---|
| \`CLIENT\` | Ver os serviços **ativos**, gerenciar **os próprios** agendamentos e consultar/editar a própria conta |
| \`BARBER\` | Ver todos os serviços, criar/editar/**desativar** serviços, consultar usuários e gerenciar **a própria agenda** |
| \`ADMIN\` | Tudo, incluindo criar usuários e ver todos os agendamentos |

Serviços **não são apagados**: para tirar um serviço de circulação ele é desativado (\`PATCH /services/{id}\` com \`{ "active": false }\`), o que preserva o histórico dos agendamentos antigos.

## Dois jeitos de criar um usuário

- **Cadastro do próprio cliente:** \`POST /auth/register\`. Rota pública, a pessoa escolhe nome, e-mail e senha. A conta é sempre \`CLIENT\`.
- **Convite criado pelo admin:** \`POST /users\`. Só o \`ADMIN\` usa; é assim que se cria um **barbeiro**. O admin **não** define senha: a conta nasce sem acesso e a pessoa recebe um e-mail de convite.

## Convite de barbeiro

1. O **ADMIN** cria o usuário em **POST /users** (nome, e-mail e perfil).
2. A API envia um e-mail de convite com um token de uso único.
3. O barbeiro copia o valor de \`token\` do link do e-mail e chama **POST /auth/accept-invite** com \`token\` e a senha que escolheu.
4. Depois disso, faz login normalmente em **POST /auth/login**.

Enquanto o convite não for aceito, o login da conta retorna 401.

## Listagens

As rotas de listagem aceitam \`?page=1&limit=10\` e retornam \`data\`, \`total\`, \`page\`, \`limit\` e \`totalPages\`.

## Erros comuns

- **401**: token ausente, inválido ou expirado (o token de login vale 1 dia), ou credenciais/convite inválidos.
- **403**: seu perfil não tem permissão para a rota.
- **404**: recurso não encontrado (em agendamentos, também quando ele é de outra pessoa).
- **409**: conflito (e-mail ou serviço já cadastrado, ou horário indisponível para o barbeiro).
`)
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);

  app.use(
    '/docs',
    apiReference({
      content: document,
    }),
  );

  await app.listen(process.env.PORT ?? 3000); // PORTA QUE RODA APLICAÇÃO
}
await bootstrap();
