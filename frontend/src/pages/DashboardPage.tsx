import { AppointmentsTable } from '../components/AppointmentsTable';
import { useAuth } from '../lib/auth';

export function DashboardPage() {
  const { role } = useAuth();

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-[28px] font-medium text-(--color-text)">
        Painel
      </h1>
      <p className="mt-2 text-sm text-(--color-text-secondary)">
        {role === 'ADMIN'
          ? 'Atendimentos de todos os barbeiros.'
          : 'Sua agenda de atendimentos.'}
      </p>

      <div className="mt-6">
        <AppointmentsTable />
      </div>
    </div>
  );
}
