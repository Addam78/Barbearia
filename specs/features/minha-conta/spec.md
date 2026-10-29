## Intenção
Tela "Minha conta", acessível por qualquer perfil autenticado (`CLIENT`,
`BARBER`, `ADMIN`), mostrando os dados básicos da própria conta: nome,
perfil e e-mail. Somente leitura nesta primeira versão — editar/remover
a própria conta fica fora de escopo aqui (spec futura, reaproveitando
os endpoints `PATCH`/`DELETE /users/:id` que já existem no backend).

## Comportamento
- Contrato da API: `GET /users/:id`, usando o `userId` do próprio
  usuário (decodificado do JWT, já disponível via `useAuth()`). O
  backend já restringe o `CLIENT` a só poder consultar a própria conta
  (404 se tentasse outro id) — o front não precisa reimplementar essa
  checagem, só usa o próprio id.
- Exibe três campos: Nome, Perfil (rótulo em pt-BR — Cliente / Barbeiro
  / Administrador, reaproveitando o mapeamento `ROLE_LABEL` já usado na
  navegação) e E-mail.
- Loading: mensagem "Carregando dados da conta..." enquanto a
  requisição não resolve.
- Erro: mensagem de erro genérica se a API falhar; se a sessão expirou
  (401 sem conseguir renovar), aciona o fluxo já existente de
  `handleSessionExpired` (redireciona pro login).
- Fora de escopo: editar nome/e-mail, trocar senha, remover conta.

## Visual
Segue `.claude/skills/design-frontend/SKILL.md` — card simples com
pares rótulo/valor, mesmo padrão visual das demais telas internas (ex:
`ServicesPage`).

## Stack
React (SPA) + Tailwind CSS, reaproveitando `useAuth()` e `getUser` de
`lib/api.ts`, e `ROLE_LABEL` de `AppLayout`.
