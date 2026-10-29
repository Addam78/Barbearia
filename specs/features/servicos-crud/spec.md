## Intenção
Completar a tela de serviços ([listagem](../listagem-servicos/spec.md)),
que hoje só lista, com **criar, editar e desativar/reativar** serviço,
as ações que `BARBER` e `ADMIN` já têm na API.

## Contrato da API (já existe, sem mudança no backend)
- `POST /services` com `{ name, price, durationMinutes }` (`BARBER` e
  `ADMIN`). `409` se já existe um serviço com o mesmo nome.
- `PATCH /services/:id` com qualquer parte de `{ name, price,
  durationMinutes, active }` (`BARBER` e `ADMIN`).
- Serviço **não é apagado** (decisão de design: o histórico de
  agendamentos continua apontando para ele). Desativar é `active: false`.

## Comportamento
- Só `BARBER` e `ADMIN` veem as ações novas. O `CLIENT` continua vendo a
  mesma listagem, sem botões.
- **Botão "Novo serviço"** ao lado do título abre um modal com o
  formulário.
- Cada linha ganha uma coluna **Ações** com:
  - **Editar**: abre o mesmo modal, já preenchido.
  - **Desativar** (serviço ativo) ou **Reativar** (inativo).
- Desativar pede confirmação (`window.confirm`, mesmo padrão de
  "Cancelar" nos agendamentos): "Desativar este serviço? Ele some para
  os clientes e não aceita novos agendamentos. Os agendamentos antigos
  continuam." Reativar não pede confirmação.
- Depois de qualquer ação com sucesso: fecha o modal e recarrega a
  lista, mantendo a página e a busca atuais.

## Formulário (client-side)
- **Nome**: obrigatório, sem espaços nas pontas.
- **Preço (R$)**: número maior que 0, com até 2 casas decimais.
- **Duração (minutos)**: inteiro maior ou igual a 1.
- Botão "Salvar" desabilitado enquanto envia (loading).
- Erros da API:
  - `409`: "Já existe um serviço com esse nome."
  - `400`: "Confira os dados informados."
  - sessão expirada: segue o fluxo padrão (`handleSessionExpired`).
  - qualquer outro: "Não foi possível salvar o serviço agora."
- Falha ao desativar/reativar: mensagem de erro acima da tabela.

## Fora de escopo
- Apagar serviço (não existe por design).
- Alterar a duração ou o preço de agendamentos já marcados (o preço
  não é gravado no agendamento; a duração só vale para novos
  horários).

## Visual
Segue `.claude/skills/design-frontend/SKILL.md`. Modal no padrão do
`RescheduleModal` (superfície `--color-panel`, borda `--color-border`,
fundo escurecido). Botão primário igual ao de `LoginPage`. Ações da
tabela no padrão de "Reagendar" (`--color-accent`) e "Cancelar"
(`--color-error`) da `AppointmentsTable`. Nenhuma decisão visual nova.

## Stack
React (SPA) + Tailwind CSS, com `createService` e `updateService` novos
em `lib/api.ts` e um componente `ServiceFormModal`.
