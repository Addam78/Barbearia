## Intenção
Criar a tela de agendamento (criar um novo corte), consumindo
`POST /appointments`, com escolha de barbeiro, serviço e horário, e
indicação visual de horário disponível/indisponível. Inclui também
dar à tela de "meus agendamentos" as ações de **cancelar** e
**reagendar**, que já existem no backend.

## Quem pode agendar pra quem
- `CLIENT`: agenda sempre **para si mesmo**, com **um barbeiro**
  (nunca outro cliente). `clientId` nunca é exposto/editável na tela —
  é sempre o usuário logado.
- `BARBER`/`ADMIN`: livres — podem agendar para si mesmos (como
  barbeiro) ou agendar um cliente com **qualquer barbeiro** (inclusive
  um colega, não precisa ser o próprio). Nesse caso a tela precisa de
  um seletor de cliente além do de barbeiro.
- Essas regras já existem no backend
  ([appointments.service.ts](../../../src/appointments/appointments.service.ts))
  — a tela só reflete.

## Passo a passo da tela
1. Escolher o **serviço** (`GET /services`, já implementado na tela de
   listagem — reaproveitar).
2. Escolher o **barbeiro** (novo endpoint, ver abaixo).
3. Escolher a **data**.
4. Ver os **horários do dia**, já calculados considerando o horário de
   funcionamento, a duração do serviço escolhido e os horários já
   ocupados desse barbeiro — disponíveis clicáveis, indisponíveis
   desabilitados/riscados.
5. Confirmar — `POST /appointments`. Se nesse intervalo alguém tiver
   acabado de ocupar o horário (corrida), o backend responde 409 e a
   tela recarrega a grade de horários com a mensagem "esse horário
   acabou de ser ocupado, escolha outro".

## Mudanças necessárias no backend
Decisões já validadas com o usuário:

- **Horário de funcionamento**: 09h às 19h, segunda a sábado (domingo
  fechado). Fixo por enquanto, não por barbeiro.
- **Granularidade dos slots**: calculada pela duração do serviço
  escolhido (não é grade fixa de 30 em 30 — o próximo horário livre
  depende de quanto dura o corte).
- **Novo endpoint `GET /users?role=BARBER`**: liberado para qualquer
  usuário logado (hoje `GET /users` é só `ADMIN`/`BARBER`). Retorna só
  `id` e `name` quando chamado com esse filtro por um `CLIENT` (sem
  e-mail nem os demais usuários) — não é uma abertura geral do
  `GET /users`, só esse filtro específico retorna dados mínimos pra
  qualquer role.
- **Novo endpoint `GET /appointments/availability?barberId=&date=&serviceId=`**:
  dado um barbeiro, uma data e um serviço (pra saber a duração),
  retorna os horários livres do dia dentro da janela de funcionamento,
  sem expor quais outros clientes/serviços ocupam os horários tomados
  — só a lista de horários disponíveis (ou, alternativamente, os
  intervalos ocupados). Acessível a qualquer usuário logado.
- **Validar `barberId`**: `POST`/`PATCH /appointments` passam a
  verificar que o `barberId` informado é de um usuário com role
  `BARBER` de verdade (hoje aceita qualquer id de usuário existente,
  inclusive `CLIENT` ou `ADMIN`). Retornar 400/404 se não for.

## Cancelar e reagendar (tela de "meus agendamentos")
Backend já pronto (`PATCH` e `DELETE /appointments/:id`), falta só a
tela:
- **Cancelar**: botão na linha do agendamento → `PATCH` com
  `{ status: 'CANCELLED' }`. Disponível pro dono do agendamento
  (`CLIENT` cancela o próprio; `BARBER` cancela da própria agenda;
  `ADMIN` cancela qualquer um).
- **Reagendar**: abre o mesmo fluxo de escolha de horário (grade de
  disponibilidade), reaproveitando o passo 3/4 acima, e envia
  `PATCH` com o novo `scheduledAt` (e `barberId`/`serviceId` se também
  mudarem). Mesmo backend que já revalida conflito.
- Ações visíveis só em agendamentos com status `PENDING` ou
  `CONFIRMED` — não faz sentido cancelar/reagendar um `CANCELLED` ou
  `COMPLETED`.
- Fora de escopo nesta spec: `BARBER`/`ADMIN` mudarem o status pra
  `CONFIRMED`/`COMPLETED` (fluxo de atendimento do dia) — fica pra uma
  spec própria do painel/dashboard.

## Comportamento adicional
- Loading state ao calcular disponibilidade (troca de barbeiro, serviço
  ou data recalcula a grade).
- Se o barbeiro escolhido não tiver nenhum horário livre no dia:
  mensagem "Nenhum horário disponível nesse dia", sem quebrar a tela.
- Validação client-side: não deixa confirmar sem serviço, barbeiro,
  data e horário escolhidos.
- Erro de conflito (409) ao confirmar: mensagem clara + recarrega a
  grade de horários daquele barbeiro/data.

## Visual
Segue `.claude/skills/design-frontend/SKILL.md` (paleta e tipografia
já usadas em `LoginPage`/`AppLayout`).

## Stack
React (SPA) + Tailwind CSS, reaproveitando `AppLayout` e os componentes
já usados nas outras telas internas.
