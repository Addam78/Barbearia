-- Agendamento cancelado não deve continuar "segurando" o horário do barbeiro.
-- Troca o índice único (barberId, scheduledAt) por um índice único PARCIAL que ignora os cancelados.
-- Assim, cancelar às 10h libera as 10h para outro cliente, e dois agendamentos ativos
-- no mesmo horário continuam bloqueados pelo próprio banco.

-- DropIndex
DROP INDEX "appointments_barberId_scheduledAt_key";

-- CreateIndex
CREATE UNIQUE INDEX "appointments_barber_slot_active_key"
  ON "appointments" ("barberId", "scheduledAt")
  WHERE "status" <> 'CANCELLED';
