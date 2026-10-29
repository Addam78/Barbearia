# Barbearia API

**Front:** <https://barbearia-git-addam-addam78s-projects.vercel.app/login>  
**Back (documentação):** <https://barbearia-api-dkzi.onrender.com/docs>

![Status: funcional e em melhoria](https://img.shields.io/badge/status-funcional%20%C2%B7%20em%20melhoria-yellow)

> O projeto está **funcional e no ar**, mas continua **em evolução**: ainda recebo melhorias de segurança, desempenho e testes. O que vem a seguir está no [Roadmap](#roadmap).

API de agendamento para barbearia, construída como projeto de estudo com foco em **conceitos de system design aplicados a um domínio real**, não apenas em aprender a sintaxe do NestJS.

> Instruções de instalação e execução estão em [SETUP.md](./SETUP.md). Com a API rodando, a documentação interativa das rotas fica em `/docs` (Scalar).

## Deploys

O projeto está no ar, em planos gratuitos.

| O quê | Hospedagem | Link |
|---|---|---|
| Frontend (React) | [Vercel](https://vercel.com) | <https://barbearia-git-addam-addam78s-projects.vercel.app> |
| Documentação da API (Scalar) | [Render](https://render.com) | <https://barbearia-api-dkzi.onrender.com/docs> |

> No plano gratuito do Render a API "dorme" depois de um tempo sem uso, então o primeiro acesso pode levar cerca de 50 segundos.

### Conta para testar

Uma conta de **cliente** de demonstração, para quem quiser experimentar sem se cadastrar:

| Campo | Valor |
|---|---|
| E-mail | `joao@email.com` |
| Senha | `senha123` |

Entre pelo frontend em `/login`, ou faça `POST /auth/login` na documentação da API e use o `accessToken` no campo Bearer. É uma conta pública de teste: não guarde dados pessoais nela. As contas de barbeiro e de administrador também existem, mas não são públicas.

## Status do projeto

### Backend: todas as rotas funcionam

Todas as rotas da API estão implementadas, cobertas por testes automatizados (unitários e e2e) e no ar em produção. A documentação interativa completa fica em `/docs`.

| Grupo | Rotas |
|---|---|
| Autenticação | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `POST /auth/accept-invite` |
| Usuários | `GET /users`, `GET /users/:id`, `POST /users` (convite), `PATCH /users/:id`, `DELETE /users/:id` |
| Serviços | `POST /services`, `GET /services`, `GET /services/:id`, `PATCH /services/:id` (desativa com `active: false`) |
| Agendamentos | `POST /appointments`, `GET /appointments`, `GET /appointments/availability`, `GET /appointments/:id`, `PATCH /appointments/:id`, `DELETE /appointments/:id` (cancela) |
| Infraestrutura | `GET /health` |

### Frontend: todas as telas implementadas

O frontend (React) cobre o fluxo completo: cadastro e login, agendamento, gestão de serviços e, para o administrador, gestão de usuários com convite de barbeiro. Ainda não há edição de usuário pela tela (a API já tem `PATCH /users/:id`).

| Tela | Rota | Status |
|---|---|---|
| Login | `/login` | Funcionando |
| Criar conta | `/register` | Funcionando: cadastro de cliente (sempre `CLIENT`, não escolhe perfil) |
| Aceitar convite | `/aceitar-convite` | Funcionando (destino do link do e-mail de convite) |
| Painel (barbeiro e admin) | `/dashboard` | Funcionando: agenda de atendimentos, com concluir, cancelar e reagendar |
| Agendar | `/agendar` | Funcionando: escolha de barbeiro, serviço, dia e horário livre |
| Agendamentos | `/meus-agendamentos` | Funcionando: listagem com concluir (barbeiro/admin), cancelar e reagendar, conforme o perfil |
| Serviços | `/servicos` | Funcionando: listagem com busca e paginação; barbeiro e admin criam, editam e desativam/reativam |
| Minha conta | `/conta` | Funcionando: exibe nome, perfil e e-mail (somente leitura) |
| Usuários (só admin) | `/usuarios` | Funcionando: lista com filtro por perfil, convite de barbeiro e remoção (cliente e barbeiro) |

## Funcionalidades

- **Autenticação com JWT** e três perfis: `CLIENT`, `BARBER` e `ADMIN`, com controle de acesso por perfil (RBAC).
- **Cadastro de cliente** aberto: a própria pessoa cria o seu acesso.
- **Criação de barbeiro por convite**: o admin cria a conta sem definir senha, a pessoa recebe um e-mail e escolhe a própria senha.
- **Catálogo de serviços** (corte, barba etc.) com preço e duração.
- **Agendamentos** que impedem dois horários sobrepostos para o mesmo barbeiro, e em que cada perfil vê só o que lhe diz respeito.
- **E-mails assíncronos**, enviados por um worker a partir de uma fila (RabbitMQ).

### Quem pode o quê

| Perfil | Serviços | Agendamentos | Usuários |
|---|---|---|---|
| `CLIENT` | consulta só os ativos | cria e gerencia os próprios | consulta, edita e remove só a própria conta |
| `BARBER` | consulta todos, cria, edita e desativa | gerencia a própria agenda | consulta qualquer usuário; edita e remove só a própria conta |
| `ADMIN` | consulta todos, cria, edita e desativa | vê e gerencia todos | cria usuários (por convite) e gerencia qualquer conta |

### Como um barbeiro entra no sistema

1. O `ADMIN` cria o usuário em `POST /users`, sem senha. A conta nasce sem acesso.
2. A API publica o evento `user.created` na fila. Um worker gera um token de convite e envia o e-mail.
3. O barbeiro usa o token em `POST /auth/accept-invite` e escolhe a senha. O token só vale uma vez.
4. A partir daí ele faz login normalmente.

## Decisões de arquitetura e por quê

- **PostgreSQL (ACID).** Agendamento é sensível a consistência: dois clientes não podem reservar o mesmo horário. Um banco relacional com transações fortes é a escolha certa, ao contrário de bancos que priorizam disponibilidade em detrimento de consistência.
- **Concorrência no agendamento.** Criar e reagendar rodam em transação com isolamento `Serializable`, que verifica a sobreposição de horários considerando a duração do serviço. Uma constraint única `(barbeiro, horário)` no banco serve de segunda barreira. Assim, duas requisições simultâneas não geram double-booking.
- **Processamento assíncrono com RabbitMQ.** Criar um usuário não espera o envio do e-mail: a API publica `user.created` e um worker cuida do convite. Falhas vão para uma *dead-letter queue*, em vez de se perderem ou derrubarem a requisição. A publicação ainda não é transacional com o banco (veja o roadmap).
- **Convite de uso único e atômico.** O token é aleatório e é "reservado" (`PENDING` → `USED`) na mesma transação que grava a senha, então duas requisições com o mesmo token não conseguem usá-lo ao mesmo tempo. Nenhuma senha viaja por e-mail.
- **Convite sem expiração por tempo.** Decisão deliberada: o token só "morre" por uso (`PENDING` → `USED`), nunca por prazo. Prioriza não travar o acesso do barbeiro por um imprevisto (esqueceu, ficou doente) em vez de forçar reenvio manual. Se o cenário mudar (ex: exigência de segurança), reavaliar.
- **Controle de acesso em camadas.** Guards globais exigem JWT em tudo, exceto nas rotas públicas, e checam o perfil por rota. Nos agendamentos, a consulta é filtrada pelo dono, e o recurso de outra pessoa responde 404 em vez de 403, para não revelar que o id existe.
- **Serviços são desativados, não apagados.** Um serviço tem o campo `active`: desativá-lo o tira da lista do cliente e bloqueia novos agendamentos, mas os agendamentos antigos continuam apontando para ele. Apagar quebraria o histórico, e o banco nem permitiria remover um serviço já usado.
- **Idempotência (parcial).** O consumo do convite é idempotente por construção (uso único). Uma chave de idempotência nas criações, para suportar retries de rede, está no roadmap.
- **Limite de tentativas.** Login, cadastro e aceite de convite têm limite por IP e por minuto (429 acima disso), para dificultar força bruta. O contador fica na memória da API, o que serve a uma instância; com várias, seria preciso um armazenamento compartilhado.
- **Logs estruturados.** Pino, com token e senha mascarados para nunca aparecerem no log.
- **Sem cache (por enquanto).** O volume e o padrão de acesso não justificam a complexidade de invalidação neste estágio; será revisitado se houver gargalo real de leitura.
- **Frontend SPA (React).** O primeiro carregamento é naturalmente mais lento (download do bundle), e as navegações seguintes são instantâneas por não recarregarem a página.

## Stack

- **API:** NestJS + TypeScript
- **Banco de dados:** PostgreSQL + Prisma ORM
- **Autenticação:** JWT (Passport) + bcrypt
- **Mensageria e e-mail:** RabbitMQ (`@golevelup/nestjs-rabbitmq`) e Nodemailer (SMTP)
- **Documentação da API:** Swagger + Scalar
- **Logs:** Pino
- **Frontend:** React + Vite + Tailwind (SPA)
- **Testes:** Vitest (unitários e e2e)
- **CI:** GitHub Actions (lint, build e testes em cada push/PR)

## Estrutura do projeto

```
src/
├── auth/           # registro, login, aceite de convite, JWT, guards e decorators de perfil
├── users/          # gestão de usuários (criação por convite pelo admin)
├── services/       # catálogo de serviços da barbearia
├── appointments/   # agendamentos, com anti-conflito de horário e acesso por dono
├── notifications/  # publicação de eventos no RabbitMQ, worker e envio de e-mail
└── prisma/         # integração com o banco via Prisma
frontend/           # SPA em React
test/               # testes e2e
```

## Roadmap

- [x] Segurança: limite de tentativas (*rate limiting*) em login, cadastro e aceite de convite
- [ ] Testes e2e no CI (com Postgres e RabbitMQ como serviços do GitHub Actions)
- [x] Desempenho: limitar a checagem de sobreposição de agendamentos à janela de tempo do horário pedido, em vez de ler todos os agendamentos do barbeiro
- [ ] Frontend: editar usuário e reenviar convite na tela de usuários
- [ ] Padrão *transactional outbox*: garantir consistência entre gravar no banco e publicar o evento na fila
- [ ] Chave de idempotência nas criações (ex: `POST /appointments`)

## Licença

Projeto pessoal de estudo, sem licença de distribuição definida (`UNLICENSED`).
