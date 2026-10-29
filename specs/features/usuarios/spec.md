## Intenção
Substituir o placeholder de `UsersPage` (`/usuarios`) pela gestão de
usuários do **ADMIN**: listar, convidar barbeiro e remover. É nessa
tela que o fluxo de convite ([aceitar-convite](../aceitar-convite/spec.md))
começa pelo painel, sem precisar chamar `POST /users` na mão.

## Contrato da API
- `GET /users?page=&limit=&role=`: já existe. Devolve `data`, `total`,
  `page`, `limit`, `totalPages`; cada usuário tem `id`, `name`, `email`,
  `role`, `createdAt`, `updatedAt`.
- `POST /users` (só `ADMIN`) com `{ name, email, role }`: já existe. A
  conta nasce sem senha e a pessoa recebe o e-mail de convite. `409` se
  o e-mail já existe.
- `DELETE /users/:id`: já existe (`ADMIN` remove qualquer conta).

## Comportamento
- Rota `/usuarios`, só para `ADMIN` (já protegida em `App.tsx`).
- **Lista paginada** (10 por página) com **Nome**, **E-mail**, **Perfil**
  e **Ações**.
- **Filtro por perfil** (Todos, Clientes, Barbeiros, Administradores),
  que reinicia a paginação.
- **Botão "Convidar barbeiro"** abre um modal com **Nome** e **E-mail**
  (o perfil é sempre `BARBER`; administradores são criados à mão no
  banco, por decisão de segurança).
  - Sucesso: o modal mostra "Convite enviado para {e-mail}. A pessoa
    define a senha pelo link do e-mail." (o envio é assíncrono, por
    fila) e a lista recarrega.
  - `409`: "Já existe um usuário com esse e-mail."
  - `400`: "Confira o nome e o e-mail informados."
  - Outros: "Não foi possível enviar o convite agora."
- **Remover**: só em linhas de `CLIENT` e `BARBER` (nunca em
  administradores, o que também evita o admin remover a si mesmo).
  Pede confirmação (`window.confirm`): "Remover {nome}? Essa ação não
  pode ser desfeita." Depois do sucesso recarrega a lista.
  - `409`: "Não é possível remover: o usuário tem agendamentos."
  - Outros: "Não foi possível remover o usuário agora."
- Estados: carregando, lista vazia para o filtro escolhido, erro de
  carga.

## Mudança no backend
`DELETE /users/:id` de um usuário que tem agendamentos falhava com erro
de chave estrangeira (`P2003`, hoje um `500`). Passa a devolver
**409 Conflict** com a mensagem "Usuário possui agendamentos e não pode
ser removido". Teste unitário e e2e cobrem o caso.

## Fora de escopo
- Editar usuário (nome e e-mail). A API existe (`PATCH /users/:id`), mas
  fica para uma próxima spec.
- Reenviar convite e ver o status do convite (pendente ou usado), que
  estão na lista de pendências da revisão técnica.
- Criar administradores pela tela.

## Visual
Segue `.claude/skills/design-frontend/SKILL.md`. Tabela no padrão de
`ServicesPage`, modal no padrão do `RescheduleModal`, botão primário
igual ao de `LoginPage`, ação "Remover" no padrão de "Cancelar"
(`--color-error`). Nenhuma decisão visual nova.

## Stack
React (SPA) + Tailwind CSS, com `getUsers`, `createUser` e `deleteUser`
novos em `lib/api.ts` e um componente `InviteBarberModal`.
