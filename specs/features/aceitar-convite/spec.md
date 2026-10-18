## Intenção
Criar a tela pública de **aceitar convite**, consumindo
`POST /auth/accept-invite`, para que um usuário criado pelo admin (hoje,
o barbeiro) defina a própria senha clicando no link do e-mail, sem
precisar chamar a API na mão.

Hoje o link do e-mail aponta para `GET http://localhost:3000/auth/accept-invite`,
que não existe (404) e tem o host fixo no código. Esta feature troca o
link para uma **página do frontend** e cria essa página.

## Fluxo
1. O admin cria o usuário em `POST /users` (sem senha). O worker gera o
   token de convite e envia o e-mail.
2. O e-mail traz o link `{FRONTEND_URL}/aceitar-convite?token=<token>`.
3. A tela lê o `token` da URL, pede **nova senha** e **confirmação** e
   envia `POST /auth/accept-invite` com `{ token, password }`.
4. Em caso de sucesso, mostra a confirmação ("Senha definida") e um
   botão para `/login`. O usuário entra com o e-mail do convite e a
   senha que acabou de escolher.

## Rota
- `/aceitar-convite` — **pública** (fora do `RequireAuth`), como
  `/login` e `/register`. Não usa `AppLayout`.
- O token vem sempre da query string (`?token=`).

## Campos e validações (client-side)
- **Nova senha**: obrigatória, mínimo de 6 caracteres (mesma regra do
  backend em `AcceptInviteDto`).
- **Confirmar senha**: obrigatória e igual à nova senha.
- Sem token na URL: a tela não mostra o formulário; exibe "Link de
  convite inválido" com atalho para `/login`.

## Comportamento
- Loading no botão enquanto envia (desabilita o botão).
- Erro `401` da API (convite inválido ou já utilizado): mensagem
  "Este convite é inválido ou já foi utilizado. Peça um novo convite ao
  administrador." (o backend não distingue os dois casos).
- Qualquer outro erro: mensagem genérica ("Não foi possível definir a
  senha agora. Tente novamente.").
- Depois do sucesso, o formulário some (não dá para reenviar o mesmo
  token).

## Mudanças necessárias no backend
Nenhuma na rota (`POST /auth/accept-invite` já existe, é pública, tem
uso único atômico e testes unitários). Mudanças de apoio:
- `MailService.sendInviteEmail` monta o link a partir de
  `FRONTEND_URL` (mesma variável já usada no CORS), em vez de
  `http://localhost:3000`.
- Teste e2e novo do fluxo completo (aceitar convite, logar com a senha
  nova, reuso do token recusado).

## Visual
Segue `.claude/skills/design-frontend/SKILL.md` (paleta, tipografia e
ícone já usados em `LoginPage`): painel de destaque com glow, card de
formulário com superfície própria, mesmos inputs e botão primário da
tela de login. Nenhuma decisão visual nova.

## Stack
React (SPA) + Tailwind CSS, reaproveitando `Mark`, os tokens de cor e
as funções de `lib/api.ts`.
