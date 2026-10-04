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

# 5. rodar em modo watch (recompila e reinicia a cada alteração)
pnpm run start:dev
```

A API sobe em `http://localhost:3000`.

## Outros modos de execução

```bash
pnpm run start        # sem watch mode
pnpm run start:debug  # watch mode + debugger
pnpm run start:prod   # produção, a partir do build em dist/
```

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

## Lint e formatação

```bash
pnpm lint      # oxlint
pnpm format    # prettier
```

## Variáveis de ambiente

Nenhum arquivo `.env*` é versionado no repositório — apenas os templates `.env.example` e `.env.test.example`. Copie-os e ajuste os valores conforme necessário (veja o passo a passo acima).

As principais variáveis:

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | string de conexão do Postgres usada pela aplicação |
| `JWT_SECRET` | segredo usado para assinar os tokens JWT |
| `POSTGRES_*` | credenciais usadas pelo `docker-compose.yml` para subir o Postgres local |
| `RABBITMQ_*` | credenciais e portas usadas pelo `docker-compose.yml` para subir o RabbitMQ local |
| `AMQP_URL` | string de conexão da aplicação com o RabbitMQ (`amqp://usuario:senha@host:porta`); deve repetir os valores de `RABBITMQ_*` |
| `FRONTEND_URL` | origem do frontend, liberada no CORS |
