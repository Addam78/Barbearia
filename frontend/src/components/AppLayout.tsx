import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Mark } from './Mark';
import { useAuth, type Role } from '../lib/auth';

type NavItem = {
  label: string;
  to: string;
  allow?: Role[];
};

const ROLE_LABEL: Record<Role, string> = {
  CLIENT: 'Cliente',
  BARBER: 'Barbeiro',
  ADMIN: 'Administrador',
};

function navItemsFor(role: Role): NavItem[] {
  const agendamentosLabel =
    role === 'CLIENT' ? 'Meus agendamentos' : role === 'BARBER' ? 'Minha agenda' : 'Agendamentos';

  const items: NavItem[] = [
    { label: 'Painel', to: '/dashboard', allow: ['BARBER', 'ADMIN'] },
    { label: 'Agendar', to: '/agendar' },
    { label: agendamentosLabel, to: '/meus-agendamentos' },
    { label: 'Serviços', to: '/servicos' },
    { label: 'Usuários', to: '/usuarios', allow: ['ADMIN'] },
    { label: 'Minha conta', to: '/conta' },
  ];

  return items.filter((item) => !item.allow || item.allow.includes(role));
}

export function AppLayout({ children }: { children: ReactNode }) {
  const { role, name, logout } = useAuth();
  const location = useLocation();

  if (!role) return null;

  const items = navItemsFor(role);

  return (
    <div className="flex min-h-screen bg-(--color-bg) text-(--color-text)">
      <aside className="flex w-64 flex-col justify-between border-r border-(--color-border) bg-(--color-panel) px-5 py-6">
        <div>
          <div className="flex items-center gap-2 px-2">
            <Mark className="h-7 w-7 text-(--color-accent)" />
            <span className="font-[family-name:var(--font-display)] text-lg text-(--color-text)">
              Fio &amp; Navalha
            </span>
          </div>

          <nav className="mt-8 flex flex-col gap-1">
            {items.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-(--color-primary) text-(--color-text)'
                      : 'text-(--color-text-secondary) hover:bg-(--color-border) hover:text-(--color-text)'
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex flex-col gap-3 border-t border-(--color-border) pt-4">
          <div className="px-2">
            <p className="text-sm text-(--color-text)">{name ?? '...'}</p>
            <p className="text-xs text-(--color-text-secondary)">{ROLE_LABEL[role]}</p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-md border border-(--color-border) px-3 py-2 text-sm text-(--color-text-secondary) transition-all hover:border-(--color-accent) hover:text-(--color-text)"
          >
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto px-10 py-10">{children}</main>
    </div>
  );
}
