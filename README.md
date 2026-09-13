# Barbearia API

API de agendamento para barbearia, construída como projeto de estudo com foco em **conceitos de system design aplicados a um domínio real** — não apenas em aprender a sintaxe do NestJS.

> Instruções de instalação e execução estão em [SETUP.md](./SETUP.md).

## Sobre o projeto

Sistema de agendamento onde clientes marcam horário para serviços (corte, barba, etc). As decisões técnicas abaixo foram tomadas de propósito, para explorar trade-offs reais de arquitetura:

- **PostgreSQL (ACID)** — agendamento é sensível a consistência: dois clientes não podem reservar o mesmo horário. Um banco relacional com transações fortes é a escolha certa, ao contrário de bancos que priorizam disponibilidade/performance em detrimento de consistência.
- **Controle de concorrência no agendamento** — a criação de um agendamento depende de constraints e/ou transações no banco que garantam exclusividade do horário, evitando double-booking mesmo sob requisições simultâneas.
- **Idempotência** — operações críticas são desenhadas para que reexecutar a mesma requisição não gere efeitos duplicados, importante quando há retries de rede.
- **Sem cache (por enquanto)** — o volume e padrão de acesso não justificam a complexidade de invalidação de cache neste estágio; será revisitado se houver gargalo real de leitura.
- **Frontend SPA (React)** — primeiro carregamento naturalmente mais lento (download do bundle), navegações seguintes instantâneas por não recarregar a página inteira.

## Stack

- **API**: NestJS + TypeScript
- **Banco de dados**: PostgreSQL + Prisma ORM
- **Autenticação**: JWT (Passport)
- **Frontend**: React (SPA)
- **Testes**: Vitest
- **CI**: GitHub Actions (lint, build e testes em cada push/PR)

## Estrutura do projeto

```
src/
├── auth/          # autenticação (registro, login, JWT)
├── users/         # gestão de usuários
├── services/      # catálogo de serviços da barbearia (corte, barba, etc.)
├── appointments/  # agendamentos
└── prisma/        # integração com o banco via Prisma
```

## Roadmap

- [ ] Constraint de exclusividade no agendamento (evitar double-booking)
- [ ] Frontend React consumindo a API

## Licença

Projeto pessoal de estudo, sem licença de distribuição definida (`UNLICENSED`).
