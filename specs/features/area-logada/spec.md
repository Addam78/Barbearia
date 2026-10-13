## Intenção
Depois do login, proteger as rotas do frontend (ninguém acessa sem token
válido) e exibir um layout único, compartilhado pelos três perfis
(`CLIENT`, `BARBER`, `ADMIN`), mas com conteúdo e permissões diferentes
por perfil (RBAC no front, espelhando o RBAC que já existe no backend).

## Como o front sabe quem é o usuário e qual a role
- O `accessToken` (JWT) já carrega `{ sub: userId, role }` no payload —
  não existe (nem precisa existir) uma rota `GET /users/me`.
- O front decodifica o payload do JWT localmente (sem chamar a API) pra
  saber `userId` e `role` assim que tem o token em mãos.
- Essa informação fica disponível pro app inteiro via um contexto/hook
  (ex: `useAuth()`), não é buscada de novo em cada tela.

## Proteção de rota (route guard)
- Toda rota, exceto `/login` e `/register`, exige `accessToken` válido.
- Sem token (ou token inválido/expirado sem conseguir renovar) →
  redireciona pra `/login`.
- Se o `accessToken` expirou (requisição comum retorna 401), o front
  tenta renovar automaticamente via `POST /auth/refresh` usando o
  `refreshToken` guardado, **antes** de redirecionar pro login. Só
  manda pro login se o refresh também falhar (refresh token inválido,
  expirado ou revogado). Na prática, a expiração do access token
  (15min) é invisível pro usuário — só o refresh token expirando (7
  dias de inatividade) ou sendo revogado desloga de verdade.
- Acessar uma rota que a role do usuário não tem permissão (ex:
  `CLIENT` tentando abrir a tela de gestão de usuários) →
  redireciona pra tela padrão do próprio perfil (não é 404 nem tela
  de erro).

## Layout compartilhado
Mesma casca visual pros três perfis (navegação + conteúdo principal) —
não existe "layout do admin" separado de "layout do cliente", é o
mesmo componente exibindo itens condicionalmente por role.

| Item | CLIENT | BARBER | ADMIN |
|---|---|---|---|
| Meus agendamentos | sim | sim (como "minha agenda") | sim (vê todos) |
| Painel/dashboard (métricas, tabela de atendimentos) | não | sim | sim |
| Serviços (catálogo) | consulta só ativos | gerencia | gerencia |
| Usuários (lista, criar barbeiro, editar/remover) | não | não | sim |
| Minha conta | sim | sim | sim |

## Regras de permissão por perfil
- **CLIENT**: vê/gerencia só os próprios agendamentos. Não cria
  usuário. Só edita/remove a própria conta.
- **BARBER**: vê/gerencia só a própria agenda. Gerencia catálogo de
  serviços. Não cria usuário. Só edita/remove a própria conta.
- **ADMIN**: vê/gerencia tudo — todos os agendamentos, todos os
  usuários. Único que cria usuário (convite de barbeiro). Edita/remove
  qualquer conta.
- Essas regras já existem no backend (tabela "Quem pode o quê" do
  [README](../../../README.md)) — o front só **reflete** visualmente o
  que a API já permite, não reimplementa autorização.

## Painel/dashboard (visível só pra BARBER e ADMIN)
Tabela/lista dos atendimentos — `BARBER` vê só a própria agenda,
`ADMIN` vê de todos. Métricas/gráficos exatos ficam fora de escopo
aqui (spec própria depois); por ora, tabela simples (data, cliente,
barbeiro, serviço, status) resolve.

## Visual
Segue o design system do projeto
(`.claude/skills/design-frontend/SKILL.md`) — mesma paleta,
tipografia e ícone da tela de login. **Não** segue a paleta do print
de referência (azul/laranja/verde) usado como inspiração de layout —
aquele print serve só de referência **estrutural** (cards de métrica,
tabela, gráfico), não de cor ou estilo visual.

## Stack
React (SPA) + Tailwind CSS, reaproveitando os componentes e tokens já
usados em `LoginPage`/`Mark`.
