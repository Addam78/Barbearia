## Intenção
A spec de [agendamento](../agendamento/spec.md) deixou de fora, de
propósito, o `BARBER`/`ADMIN` poder marcar um atendimento como
concluído. Esta spec cobre exatamente essa lacuna: dar ao barbeiro
(dono da agenda) e ao admin um jeito de fechar o ciclo de um
agendamento que já aconteceu, mudando o status pra `COMPLETED` — hoje
ele fica preso em `PENDING`/`CONFIRMED` pra sempre, mesmo depois do
corte feito.

## Comportamento
- Contrato da API: já existe, sem mudança no backend —
  `PATCH /appointments/:id` com `{ status: 'COMPLETED' }`
  ([appointments.controller.ts](../../../src/appointments/appointments.controller.ts)).
- Botão **"Concluir"** na linha do agendamento, na mesma tabela de
  `AppointmentsTable` usada em "meus agendamentos"/"minha agenda"/
  painel.
- Visível só pra `BARBER` (na própria agenda) e `ADMIN` (em qualquer
  agendamento) — `CLIENT` não marca o próprio atendimento como
  concluído, só o profissional confirma que atendeu.
- Visível só em agendamentos com status `PENDING` ou `CONFIRMED` (os
  mesmos que já mostram Reagendar/Cancelar) — não faz sentido concluir
  um `CANCELLED`, e um `COMPLETED` já está concluído.
- Confirmação simples (`window.confirm`, mesmo padrão já usado em
  "Cancelar") antes de enviar, pra evitar clique acidental.
- Após concluir: recarrega a lista, status muda pra "Concluído".
- Fora de escopo: desfazer uma conclusão, e o `CLIENT` ver outros
  status intermediários (ex: `CONFIRMED` como "check-in" separado de
  concluído) — já existe `CONFIRMED` no enum mas seu uso fica pra outra
  spec.

## Visual
Mesmo padrão visual dos botões de ação já existentes na tabela
(`Reagendar` em `--color-accent`, `Cancelar` em `--color-error`) — o
novo botão "Concluir" segue a mesma linha de texto/tamanho.

## Stack
React (SPA) + Tailwind CSS, reaproveitando `AppointmentsTable` e
`updateAppointment` de `lib/api.ts`.
