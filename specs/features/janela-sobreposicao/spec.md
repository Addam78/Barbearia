## Intenção
Reduzir o que a checagem de sobreposição lê ao criar ou reagendar um
agendamento. Hoje ela faz `findMany` de **todos** os agendamentos não
cancelados do barbeiro, em ordem cronológica de toda a vida dele, e
compara um a um em JavaScript. Dentro de uma transação `Serializable`,
isso pesa de duas formas:
- cada requisição lê cada vez mais linhas conforme o histórico cresce;
- uma leitura grande aumenta as chances de a transação ser abortada
  por cautela (`P2034`), mesmo sem conflito real.

## Comportamento
- A consulta passa a trazer só os agendamentos que **podem** se
  sobrepor ao pedido `[startsAt, endAt)`:
  `scheduledAt` entre `startsAt - 24h` e `endAt`.
  - Quem começa depois de `endAt` não se sobrepõe.
  - Quem começou mais de 24h antes de `startsAt` já terminou, porque
    nenhum serviço dura mais de 24h.
- A conta exata de sobreposição (início menor que o fim do outro e fim
  maior que o início do outro) continua igual e acontece depois, em
  JavaScript, só sobre essa janela.
- Vale para `create` e para o reagendamento em `update` (o
  agendamento que está sendo alterado continua fora da checagem).

## Regra nova no backend
A janela só é correta se existir um teto de duração: `durationMinutes`
de um serviço passa a aceitar de **1 a 1440** (24h). Antes só tinha o
mínimo de 1. O formulário de serviço no frontend aplica o mesmo teto.

## Testes
- Unitário: a consulta é feita com a janela esperada (pedido 12h00 a
  12h30 lê de 24h antes até 12h30); sobreposição dentro da janela
  continua devolvendo 409.
- e2e: duração 1441 é recusada (400) e 1440 é aceita; os cenários de
  sobreposição e de reservas simultâneas seguem passando.

## Fora de escopo
- Índice no banco para `(barberId, scheduledAt)` além do índice único
  parcial que já existe (item de revisão técnica).
- `getAvailability`, que já consultava só o dia pedido.

## Stack
NestJS + Prisma (`AppointmentsService`), com `@Max(1440)` em
`CreateServiceDto`.
