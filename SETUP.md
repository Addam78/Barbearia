# Setup e execução

## Pré-requisitos

- [Node.js 22+](https://nodejs.org)
- [pnpm 10+](https://pnpm.io)
- [Docker](https://www.docker.com/) (para o Postgres e o RabbitMQ locais)

## Passo a passo

```bash
# 1. instalar dependências
pnpm install

# 2. copiar variáveis de ambiente
cp .env.example .env
cp .env.test.example .env.test

# 3. subir o Postgres e o RabbitMQ
docker compose up -d

# 4. aplicar as migrations
pnpm prisma migrate deploy

# 5. (opcional) popular o banco com usuários e serviços de exemplo
pnpm prisma db seed

# 6. rodar em modo watch (recompila e reinicia a cada alteração)
pnpm run start:dev
```

Antes do passo 3, abra o `.env` e troque o `JWT_SECRET` por um valor seu:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

A API sobe em `http://localhost:3000` (ou na porta definida em `PORT`, se a 3000 já estiver ocupada na sua máquina). A documentação interativa fica em `http://localhost:3000/docs`.

> O `.env` só é lido na inicialização: se você alterá-lo, reinicie o `start:dev`.

## Outros modos de execução

```bash
pnpm run start        # sem watch mode
pnpm run start:debug  # watch mode + debugger
pnpm run start:prod   # produção, a partir do build em dist/
```

## Testando a API pelo Scalar

Abra `/docs`. Se você rodou o seed (passo 5), existem estes usuários, todos com a senha `123456` (use só em desenvolvimento):

| Perfil | E-mail |
|---|---|
| `ADMIN` | `admin@barbearia.com` |
| `BARBER` | `barbeiro1@barbearia.com`, `barbeiro2@barbearia.com` |
| `CLIENT` | `cliente1@barbearia.com`, `cliente2@barbearia.com` |

1. Faça `POST /auth/login` com um deles e copie o `accessToken`.
2. Cole o token na autenticação **Bearer** do Scalar. As rotas protegidas passam a funcionar com o perfil desse usuário.

### Criando um barbeiro por convite

O barbeiro **não** tem senha definida pelo admin. O caminho é:

1. Logado como `ADMIN`, chame `POST /users` com `name`, `email` e `role: "BARBER"`.
2. A API envia um e-mail de convite (veja a seção seguinte sobre configurar o envio).
3. Do link do e-mail, copie só o valor depois de `token=`. O link em si ainda não abre uma tela, porque o frontend não tem essa página.
4. Chame `POST /auth/accept-invite` com `{ "token": "...", "password": "..." }`. O token só vale uma vez.
5. Agora o barbeiro entra normalmente em `POST /auth/login` com o e-mail e a senha que escolheu. Antes do aceite, o login dessa conta retorna 401.

### Configurando o envio de e-mail

O e-mail do convite sai pelo SMTP configurado no `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` e `SMTP_PASS`; o `SMTP_USER` também é o remetente). Em desenvolvimento, use uma caixa de testes, como o [Mailtrap](https://mailtrap.io), para não enviar e-mails reais.

Se o envio falhar (SMTP errado ou fora do ar), o convite já foi gravado no banco, e a mensagem vai para a *dead-letter queue* do RabbitMQ. Para pegar o token direto do banco:

```bash
docker exec barbearia-postgres psql -U barbearia -d barbearia -c 'select token, status from invite_tokens order by "createdAt" desc limit 1;'
```

(troque usuário e banco pelos do seu `.env`).

## Frontend

O frontend (React + Vite) fica em `frontend/` e tem as próprias dependências:

```bash
cd frontend
cp .env.example .env     # VITE_API_URL deve apontar para a porta da API
pnpm install
pnpm dev                 # http://localhost:5173
```

O endereço do frontend precisa bater com o `FRONTEND_URL` do `.env` da API (CORS).

## Testes

```bash
pnpm test          # testes unitários
pnpm test:watch    # testes unitários em modo watch
pnpm test:cov      # cobertura
pnpm test:e2e      # testes end-to-end (precisam do Postgres e do RabbitMQ, ver abaixo)
```

## Testes e2e

Os testes e2e sobem a aplicação inteira e usam um banco próprio (`barbearia_test`), separado do de desenvolvimento. Para rodá-los:

1. **Crie o `.env.test`** a partir do template (já está no passo a passo acima):

   ```bash
   cp .env.test.example .env.test
   ```

   Ele precisa ter `DATABASE_URL` (apontando para `barbearia_test`), `JWT_SECRET` e **`AMQP_URL`**. Usuário, senha e porta do Postgres e do RabbitMQ devem ser os mesmos do seu `.env`.

2. **Suba os containers** (Postgres e RabbitMQ):

   ```bash
   docker compose up -d
   ```

3. **Garanta que o banco `barbearia_test` existe.** O `docker/init-test-db.sh` cria esse banco automaticamente, mas só na **primeira** vez que o volume do Postgres é criado. Se o seu volume é mais antigo, crie manualmente (troque usuário e banco pelos do seu `.env`):

   ```bash
   docker exec barbearia-postgres psql -U barbearia -d barbearia -c 'CREATE DATABASE barbearia_test;'
   ```

4. **Rode os testes:**

   ```bash
   pnpm test:e2e
   ```

   Antes dos testes, o script aplica as migrations no banco de teste sozinho (`pretest:e2e`). Para zerar o banco de teste e reaplicar tudo do zero, use `pnpm db:test:reset`.

Problemas comuns:

| Sintoma | Causa provável |
|---|---|
| `Cannot destructure property 'hostname' of 'undefined'` | `AMQP_URL` não está definida no `.env.test` |
| Erro de conexão ou autenticação com o RabbitMQ | RabbitMQ fora do ar, ou usuário, senha e porta da `AMQP_URL` diferentes dos de `RABBITMQ_*` |
| `database "barbearia_test" does not exist` | o banco de teste não foi criado (passo 3) |
| `invalid hostPort` ao rodar `docker compose up` | alguma porta do `.env` está fora do intervalo 1 a 65535 (confira `RABBITMQ_MANAGEMENT_PORT`) |
| `EADDRINUSE: address already in use :::3000` | outro programa usa a porta 3000; defina `PORT` no `.env` |

## Lint e formatação

```bash
pnpm lint      # oxlint
pnpm format    # prettier
```

## Variáveis de ambiente

Nenhum arquivo `.env*` é versionado no repositório, apenas os templates `.env.example` e `.env.test.example`. Copie-os e ajuste os valores conforme necessário (veja o passo a passo acima).

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | string de conexão do Postgres usada pela aplicação |
| `JWT_SECRET` | segredo usado para assinar os tokens JWT |
| `PORT` | porta da API (opcional, padrão `3000`) |
| `POSTGRES_*` | credenciais usadas pelo `docker-compose.yml` para subir o Postgres local |
| `RABBITMQ_*` | credenciais e portas usadas pelo `docker-compose.yml` para subir o RabbitMQ local |
| `AMQP_URL` | string de conexão da aplicação com o RabbitMQ (`amqp://usuario:senha@host:porta`); deve repetir os valores de `RABBITMQ_*` |
| `FRONTEND_URL` | origem do frontend, liberada no CORS |
| `SMTP_*` | servidor SMTP usado para enviar o e-mail de convite (`SMTP_USER` também é o remetente) |
