## Intenção
Permitir que uma pessoa sem conta crie o próprio acesso como cliente,
consumindo a rota que já existe no backend (`POST /auth/register`).
Esta tela é só para cliente (`CLIENT`) se autocadastrar — não existe
campo de perfil, e o backend ignora/não aceita essa escolha: a conta
criada aqui é sempre `CLIENT`. Barbeiro e admin não se cadastram por
aqui; essas contas nascem por convite do admin (`POST /users` +
`POST /auth/accept-invite`), o que já está implementado e fora de
escopo nesta spec.

## Comportamento
- Formulário: nome, e-mail, senha (mínimo 6 caracteres).
- Contrato da API: `POST /auth/register`, body
  `{ name, email, password }`. Sucesso (201) retorna
  `{ id, name, email }` — **sem token**: a conta é criada mas a sessão
  não abre sozinha.
- Sucesso: redireciona para `/login` (o usuário faz login em seguida
  com o e-mail/senha que acabou de cadastrar).
- E-mail já cadastrado: API retorna 409 — exibir "Este e-mail já está
  cadastrado.".
- Validação client-side: nome obrigatório, e-mail em formato válido,
  senha com no mínimo 6 caracteres.
- Loading: desabilitar botão + spinner durante a requisição.
- Responsivo: mesmo layout de `/login` (painel de destaque à esquerda,
  formulário à direita; painel some em mobile).
- Incluir link "já tenho conta" direcionando para `/login`.
- Fora de escopo: confirmação de e-mail, criação de barbeiro/admin
  (feita pelo admin via convite), login automático pós-cadastro.

## Visual
Segue `.claude/skills/design-frontend/SKILL.md` — reaproveita a mesma
estrutura visual da tela de login (`LoginPage`/`Mark`).

## Stack
React (SPA) + Tailwind CSS, reaproveitando os componentes já usados em
`LoginPage`.
