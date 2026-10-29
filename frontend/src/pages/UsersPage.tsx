import { useCallback, useEffect, useState } from 'react';
import { ROLE_LABEL } from '../components/AppLayout';
import { InviteBarberModal } from '../components/InviteBarberModal';
import { ApiError, SessionExpiredError, deleteUser, getUsers, type Role, type UserRow } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PRIMARY_BUTTON_CLASS } from '../lib/ui';

const LIMIT = 10;

const FILTERS: { value: '' | Role; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'CLIENT', label: 'Clientes' },
  { value: 'BARBER', label: 'Barbeiros' },
  { value: 'ADMIN', label: 'Administradores' },
];

export function UsersPage() {
  const { handleSessionExpired } = useAuth();
  const [roleFilter, setRoleFilter] = useState<'' | Role>('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ data: UserRow[]; totalPages: number } | null>(null);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [inviting, setInviting] = useState(false);

  const reload = useCallback(() => setReloadKey((current) => current + 1), []);

  useEffect(() => {
    setPage(1);
  }, [roleFilter]);

  useEffect(() => {
    let active = true;
    setResult(null);
    setError('');

    getUsers(page, LIMIT, roleFilter || undefined)
      .then((response) => {
        if (active) setResult({ data: response.data, totalPages: response.totalPages });
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof SessionExpiredError) {
          handleSessionExpired();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os usuários.');
      });

    return () => {
      active = false;
    };
  }, [page, roleFilter, reloadKey, handleSessionExpired]);

  async function handleRemove(user: UserRow) {
    if (!window.confirm(`Remover ${user.name}? Essa ação não pode ser desfeita.`)) return;

    setActionError('');
    setBusyId(user.id);

    try {
      await deleteUser(user.id);
      reload();
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }
      setActionError(
        err instanceof ApiError && err.status === 409
          ? 'Não é possível remover: o usuário tem agendamentos.'
          : 'Não foi possível remover o usuário agora.',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-[28px] font-medium text-(--color-text)">
          Usuários
        </h1>

        <button type="button" onClick={() => setInviting(true)} className={PRIMARY_BUTTON_CLASS}>
          Convidar barbeiro
        </button>
      </div>

      <div className="mt-6 flex items-center gap-3">
        <label htmlFor="role-filter" className="text-sm text-(--color-text-secondary)">
          Perfil
        </label>
        <select
          id="role-filter"
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as '' | Role)}
          className="rounded-lg border border-(--color-border) bg-(--color-panel) px-3 py-2 text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
        >
          {FILTERS.map((filter) => (
            <option key={filter.value} value={filter.value}>
              {filter.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-6">
        {error && <p className="text-sm text-(--color-error)">{error}</p>}
        {actionError && (
          <p role="alert" className="mb-3 text-sm text-(--color-error)">
            {actionError}
          </p>
        )}

        {!error && !result && <p className="text-sm text-(--color-text-secondary)">Carregando usuários...</p>}

        {!error && result && result.data.length === 0 && (
          <p className="text-sm text-(--color-text-secondary)">
            {roleFilter ? 'Nenhum usuário com esse perfil.' : 'Nenhum usuário cadastrado.'}
          </p>
        )}

        {!error && result && result.data.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-panel)">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-(--color-border) text-(--color-text-secondary)">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">E-mail</th>
                  <th className="px-4 py-3 font-medium">Perfil</th>
                  <th className="px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {result.data.map((user) => (
                  <tr key={user.id} className="border-b border-(--color-border) last:border-0">
                    <td className="px-4 py-3 text-(--color-text)">{user.name}</td>
                    <td className="px-4 py-3 text-(--color-text-secondary)">{user.email}</td>
                    <td className="px-4 py-3 text-(--color-text-secondary)">{ROLE_LABEL[user.role]}</td>
                    <td className="px-4 py-3">
                      {user.role !== 'ADMIN' && (
                        <button
                          type="button"
                          onClick={() => handleRemove(user)}
                          disabled={busyId === user.id}
                          className="text-(--color-error) hover:underline disabled:opacity-50"
                        >
                          Remover
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!error && result && result.totalPages > 1 && (
          <div className="mt-4 flex items-center gap-3 text-sm text-(--color-text-secondary)">
            <button
              type="button"
              onClick={() => setPage((current) => current - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-(--color-border) px-3 py-1.5 disabled:opacity-40"
            >
              Anterior
            </button>
            <span>
              Página {page} de {result.totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= result.totalPages}
              className="rounded-lg border border-(--color-border) px-3 py-1.5 disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </div>

      {inviting && <InviteBarberModal onClose={() => setInviting(false)} onInvited={reload} />}
    </div>
  );
}
