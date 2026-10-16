import { useEffect, useState } from 'react';
import {
  ApiError,
  SessionExpiredError,
  cancelAppointment,
  getAppointments,
  getAvailability,
  updateAppointment,
  type Appointment,
} from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDateTime, formatSlotLabel, todayISODate } from '../lib/datetime';

const STATUS_LABEL: Record<Appointment['status'], string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Concluído',
};

const formatDate = formatDateTime;

/** Modal simples de reagendamento: mesmo barbeiro/serviço, nova data e horário. */
function RescheduleModal({
  appointment,
  onClose,
  onRescheduled,
}: {
  appointment: Appointment;
  onClose: () => void;
  onRescheduled: () => void;
}) {
  const { handleSessionExpired } = useAuth();
  const [date, setDate] = useState(todayISODate());
  const [slots, setSlots] = useState<string[] | null>(null);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSlots(null);
    setSelectedSlot('');
    setError('');

    let active = true;
    getAvailability(appointment.barberId, date, appointment.serviceId)
      .then((result) => {
        if (active) setSlots(result.slots);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof SessionExpiredError) {
          handleSessionExpired();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os horários.');
      });

    return () => {
      active = false;
    };
  }, [date, appointment.barberId, appointment.serviceId, handleSessionExpired]);

  async function handleConfirm() {
    setSubmitting(true);
    setError('');

    try {
      await updateAppointment(appointment.id, { scheduledAt: selectedSlot });
      onRescheduled();
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        setError('Esse horário acabou de ser ocupado. Escolha outro.');
        setSelectedSlot('');
        getAvailability(appointment.barberId, date, appointment.serviceId).then((result) => setSlots(result.slots));
      } else {
        setError(err instanceof ApiError ? err.message : 'Não foi possível reagendar agora.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-md rounded-xl border border-(--color-border) bg-(--color-panel) p-6">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-(--color-text)">Reagendar</h2>
        <p className="mt-1 text-sm text-(--color-text-secondary)">{appointment.service.name} com {appointment.barber.name}</p>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm text-(--color-text-secondary)">Nova data</label>
          <input
            type="date"
            value={date}
            min={todayISODate()}
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded-lg border border-(--color-border) bg-(--color-bg) px-4 py-2 text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm text-(--color-text-secondary)">Horário</label>

          {slots === null && !error && <p className="text-sm text-(--color-text-secondary)">Carregando...</p>}
          {slots !== null && slots.length === 0 && !error && (
            <p className="text-sm text-(--color-text-secondary)">Nenhum horário disponível nesse dia.</p>
          )}
          {slots !== null && slots.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${
                    selectedSlot === slot
                      ? 'border-(--color-accent) bg-(--color-accent) text-(--color-bg)'
                      : 'border-(--color-border) text-(--color-text) hover:border-(--color-accent)'
                  }`}
                >
                  {formatSlotLabel(slot)}
                </button>
              ))}
            </div>
          )}
        </div>

        {error && <p className="mt-3 text-sm text-(--color-error)">{error}</p>}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-(--color-border) px-4 py-2 text-sm text-(--color-text-secondary)"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!selectedSlot || submitting}
            onClick={handleConfirm}
            className="rounded-lg bg-(--color-accent) px-4 py-2 text-sm font-medium text-(--color-bg) disabled:opacity-40"
          >
            {submitting ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Tabela de agendamentos (data, cliente, barbeiro, serviço, status), com ações de cancelar/reagendar. */
export function AppointmentsTable() {
  const { handleSessionExpired } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [error, setError] = useState('');
  const [reschedulingId, setReschedulingId] = useState<string | null>(null);

  function load() {
    getAppointments(1, 20)
      .then((result) => setAppointments(result.data))
      .catch((err) => {
        if (err instanceof SessionExpiredError) {
          handleSessionExpired();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os agendamentos.');
      });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleCancel(id: string) {
    if (!window.confirm('Cancelar este agendamento?')) return;

    try {
      await cancelAppointment(id);
      load();
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }
      setError(err instanceof ApiError ? err.message : 'Não foi possível cancelar agora.');
    }
  }

  if (error) {
    return <p className="text-sm text-(--color-error)">{error}</p>;
  }

  if (!appointments) {
    return <p className="text-sm text-(--color-text-secondary)">Carregando agendamentos...</p>;
  }

  if (appointments.length === 0) {
    return <p className="text-sm text-(--color-text-secondary)">Nenhum agendamento encontrado.</p>;
  }

  const reschedulingAppointment = appointments.find((appointment) => appointment.id === reschedulingId) ?? null;

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-panel)">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-(--color-border) text-(--color-text-secondary)">
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Barbeiro</th>
              <th className="px-4 py-3 font-medium">Serviço</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((appointment) => {
              const canAct = appointment.status === 'PENDING' || appointment.status === 'CONFIRMED';
              return (
                <tr key={appointment.id} className="border-b border-(--color-border) last:border-0">
                  <td className="px-4 py-3 text-(--color-text)">{formatDate(appointment.scheduledAt)}</td>
                  <td className="px-4 py-3 text-(--color-text-secondary)">{appointment.client.name}</td>
                  <td className="px-4 py-3 text-(--color-text-secondary)">{appointment.barber.name}</td>
                  <td className="px-4 py-3 text-(--color-text-secondary)">{appointment.service.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full border border-(--color-border) px-2.5 py-1 text-xs text-(--color-accent)">
                      {STATUS_LABEL[appointment.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {canAct && (
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setReschedulingId(appointment.id)}
                          className="text-xs text-(--color-accent) hover:underline"
                        >
                          Reagendar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCancel(appointment.id)}
                          className="text-xs text-(--color-error) hover:underline"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {reschedulingAppointment && (
        <RescheduleModal
          appointment={reschedulingAppointment}
          onClose={() => setReschedulingId(null)}
          onRescheduled={() => {
            setReschedulingId(null);
            load();
          }}
        />
      )}
    </>
  );
}
