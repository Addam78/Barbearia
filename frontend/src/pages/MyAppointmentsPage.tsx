import { AppointmentsTable } from '../components/AppointmentsTable';
import { useAuth } from '../lib/auth';

const TITLE: Record<string, string> = {
  CLIENT: 'Meus agendamentos',
  BARBER: 'Minha agenda',
  ADMIN: 'Agendamentos',
};

export function MyAppointmentsPage() {
  const { role } = useAuth();

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-[28px] font-medium text-(--color-text)">
        {role ? TITLE[role] : 'Agendamentos'}
      </h1>

      <div className="mt-6">
        <AppointmentsTable />
      </div>
    </div>
  );
}
