import { useEffect, useState } from 'react';
import { ApiError, SessionExpiredError, getAppointments, type Appointment } from '../lib/api';
import { useAuth } from '../lib/auth';

const STATUS_LABEL: Record<Appointment['status'], string> = {
  PENDING: 'Pendente',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Concluído',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Tabela simples de agendamentos (data, cliente, barbeiro, serviço, status). */
export function AppointmentsTable() {
  const { handleSessionExpired } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    getAppointments(1, 20)
      .then((result) => {
        if (active) setAppointments(result.data);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof SessionExpiredError) {
          handleSessionExpired();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os agendamentos.');
      });

    return () => {
      active = false;
    };
  }, [handleSessionExpired]);

  if (error) {
    return <p className="text-sm text-(--color-error)">{error}</p>;
  }

  if (!appointments) {
    return <p className="text-sm text-(--color-text-secondary)">Carregando agendamentos...</p>;
  }

  if (appointments.length === 0) {
    return <p className="text-sm text-(--color-text-secondary)">Nenhum agendamento encontrado.</p>;
  }

  return (
    <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-panel)">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-(--color-border) text-(--color-text-secondary)">
            <th className="px-4 py-3 font-medium">Data</th>
            <th className="px-4 py-3 font-medium">Cliente</th>
            <th className="px-4 py-3 font-medium">Barbeiro</th>
            <th className="px-4 py-3 font-medium">Serviço</th>
            <th className="px-4 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {appointments.map((appointment) => (
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
