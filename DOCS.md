# Documentação da API

Este projeto tem documentação interativa das rotas, gerada com **Swagger + Scalar**.

## Como acessar

1. Rode a aplicação (veja [SETUP.md](./SETUP.md) para instalar e configurar).
2. Com a API no ar, acesse `http://localhost:3000/docs` (ou a porta definida em `PORT`).
3. A página do Scalar lista todas as rotas, agrupadas por recurso, com exemplos de request/response.

## O que tem lá

- Introdução ao domínio (agendamento de barbearia) e como autenticar.
- Fluxo de login e de convite de barbeiro, passo a passo.
- Tabela de perfis (`CLIENT`, `BARBER`, `ADMIN`) e o que cada um pode fazer.
- Botão **Authorize** para colar o token (`Bearer`) e testar rotas protegidas direto pela interface.
- Explicação dos erros comuns (401, 403, 404, 409).

Esse conteúdo é definido em [src/main.ts](./src/main.ts).

## Outras documentações do projeto

- [README.md](./README.md) — visão geral, arquitetura e decisões técnicas.
- [SETUP.md](./SETUP.md) — instalação e execução.
- [specs/features/](./specs/features/) — especificação de funcionalidades.
