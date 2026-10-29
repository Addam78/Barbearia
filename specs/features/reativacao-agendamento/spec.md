## Intenção
Fechar uma lacuna de consistência no backend: hoje é possível reativar
um agendamento **cancelado** com `PATCH /appointments/:id` enviando só
`{ status: 'PENDING' }` (ou `CONFIRMED`), e esse caminho **não confere a
sobreposição de horários**.

Cenário (serviço de 30 min, mesmo barbeiro):
1. João cancela o agendamento das 10h00. O horário libera.
2. Maria agenda às 10h15. Aceito, porque o das 10h00 está cancelado.
3. Alguém reativa o das 10h00. O caminho só de status não roda a
   checagem de sobreposição nem a transação `Serializable`, e o índice
   único parcial (`appointments_barber_slot_active_key`) só reage a
   início **idêntico**. Resultado: dois agendamentos ativos sobrepostos
   (10h00 a 10h30 e 10h15 a 10h45) para o mesmo barbeiro.

O problema foi reproduzido com um teste unitário (banco simulado) em
2026-10-19: o serviço devolveu o agendamento reativado em vez de `409`.

## Decisão
**Proibir a reativação.** Um agendamento cancelado não volta a ficar
ativo; quem quer o horário de novo cria um agendamento novo, que passa
pela transação `Serializable` e pela checagem de sobreposição.

Alternativa descartada: passar a reativação pela mesma transação
`Serializable`. Exigiria mais código e manteria uma regra de negócio
duvidosa (o horário pode já ter sido ocupado por outra pessoa, e o
cliente esperava que o cancelamento fosse definitivo).

## Comportamento
- `PATCH /appointments/:id` em um agendamento com status `CANCELLED`:
  - com `status` diferente de `CANCELLED` (`PENDING`, `CONFIRMED` ou
    `COMPLETED`): **409 Conflict**, mensagem "Agendamento cancelado não
    pode ser reativado. Crie um novo agendamento.";
  - vale para todos os perfis, e também quando o `status` vem junto de
    `scheduledAt`/`barberId`/`serviceId`;
  - reenviar `CANCELLED` num agendamento já cancelado continua
    permitido (idempotente).
- Todo o resto do `PATCH` fica como está: cancelar, concluir e
  reagendar agendamentos ativos.
- O caminho só de status deixa de depender do índice único parcial
  (a reativação, que era o único jeito de um agendamento voltar ao
  conjunto de ativos por esse caminho, deixa de existir).

## Backend
- `AppointmentsService.update`: checagem logo após `findOwned`.
- Descrição do `PATCH` no Swagger menciona a regra.

## Testes
- Unitário: reativar cancelado vira `ConflictException` sem chamar o
  banco; cancelar um pendente continua funcionando; reativar junto de
  reagendamento também é recusado.
- e2e: cancelar e tentar reativar devolve `409`, mesmo com o horário
  livre (substitui o teste antigo, que só cobria o horário ocupado).

## Fora de escopo
- Quais status cada perfil pode escolher (por exemplo, o `CLIENT` só
  cancelar). Continua na lista de pendências de regras de negócio.

## Stack
NestJS + Prisma, com os testes em Vitest (unitário e e2e).
