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

# 5. (opcional, só desenvolvimento) popular o banco com admin, barbeiros, clientes e serviços de exemplo
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

Abra `/docs`. Se você rodou o seed (passo 5), existem estes usuários de exemplo, todos com a senha pública `123456`. Esse seed é só para desenvolvimento: ele **se recusa a rodar** com `NODE_ENV=production` ou em um banco que não seja local.

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
3. O link do e-mail abre a tela **`/aceitar-convite`** do frontend (`{FRONTEND_URL}/aceitar-convite?token=...`). O barbeiro digita a senha que quer usar duas vezes e confirma. O convite só vale uma vez.
4. Agora ele entra normalmente na tela de login, com o e-mail e a senha que escolheu. Antes do aceite, o login dessa conta retorna 401.

Sem o frontend rodando, o mesmo passo 3 pode ser feito pela API: copie o valor depois de `token=` do link e chame `POST /auth/accept-invite` com `{ "token": "...", "password": "..." }`.

O link usa a variável `FRONTEND_URL` do `.env` da API (a mesma do CORS), então ela precisa apontar para o endereço onde o frontend está rodando.

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
pnpm install --ignore-workspace
pnpm dev                 # http://localhost:5173
```

O `--ignore-workspace` é necessário: sem ele, o `pnpm` encontra o `pnpm-workspace.yaml` da raiz e instala as dependências da API em vez das do frontend.

## Usuários iniciais em produção

O seed de desenvolvimento (`pnpm prisma db seed`) **nunca** deve rodar em produção: ele cria usuários com a senha pública `123456`. Em produção:

1. **Admin: crie o seu à mão, direto no banco** (não existe admin padrão). Em um cliente SQL (Beekeeper, DBeaver, `psql`), troque os valores e rode:

   ```sql
   create extension if not exists pgcrypto;

   insert into users (id, name, email, password, role, "createdAt", "updatedAt")
   values (
     gen_random_uuid()::text,
     'Seu Nome',
     'seu@email.com',
     crypt('SUA_SENHA_AQUI', gen_salt('bf', 10)),
     'ADMIN',
     now(),
     now()
   );

   drop extension pgcrypto;
   ```

   O `password` é guardado como hash bcrypt (o login compara com a senha que você digitou). Depois de rodar, apague a consulta do histórico do cliente SQL, porque a senha ficou escrita nela. Se preferir que a senha nunca apareça em SQL, gere o hash no terminal e cole só ele no campo `password`:

   ```bash
   read -rsp "Senha do admin: " P; echo; P="$P" node -e 'console.log(require("bcryptjs").hashSync(process.env.P, 10))'; unset P
   ```

2. **Barbeiros: pelo convite.** O admin cria em `POST /users` (ou na tela de usuários) e a pessoa define a própria senha pelo link do e-mail. Barbeiro enxerga a lista de usuários e edita serviços, por isso não há barbeiros de demonstração com senha compartilhada.
3. **Clientes:** se cadastram sozinhos. Se quiser contas de clientes de demonstração, use o seed de produção, que cria só clientes e **não tem senha fixa** (a senha vem da variável `SEED_PASSWORD`):

   ```bash
   SEED_PASSWORD='uma-senha-forte' pnpm seed:prod
   ```

   Ele precisa do `tsx` (dependência de desenvolvimento), então rode onde as dependências de desenvolvimento estiverem instaladas, apontando o `DATABASE_URL` para o banco de produção.

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
