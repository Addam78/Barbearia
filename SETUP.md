# Setup e execução

## Pré-requisitos

- [Node.js 22+](https://nodejs.org)
- [pnpm 10+](https://pnpm.io)
- [Docker](https://www.docker.com/) (para o Postgres local)

## Passo a passo

```bash
# 1. instalar dependências
pnpm install

# 2. copiar variáveis de ambiente
cp .env.example .env
cp .env.test.example .env.test

# 3. subir o Postgres
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
pnpm test:e2e      # testes end-to-end (usa o banco de teste, ver abaixo)
```

## Banco de dados de teste (para os testes e2e)

O `.env` já define `POSTGRES_TEST_DB`. Antes de rodar `pnpm test:e2e`, garanta que esse banco está migrado:

```bash
pnpm db:test:reset
```

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
