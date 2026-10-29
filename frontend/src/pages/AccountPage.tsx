import { useEffect, useState } from 'react';
import { ROLE_LABEL } from '../components/AppLayout';
import { ApiError, SessionExpiredError, getUser, type Account } from '../lib/api';
import { useAuth } from '../lib/auth';

export function AccountPage() {
  const { userId, handleSessionExpired } = useAuth();
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!userId) return;

    let active = true;
    setAccount(null);
    setError('');

    getUser(userId)
      .then((data) => {
        if (active) setAccount(data);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof SessionExpiredError) {
          handleSessionExpired();
          return;
        }
        setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os dados da conta.');
      });

    return () => {
      active = false;
    };
  }, [userId, handleSessionExpired]);

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-[28px] font-medium text-(--color-text)">
        Minha conta
      </h1>

      <div className="mt-6 max-w-md">
        {error && <p className="text-sm text-(--color-error)">{error}</p>}

        {!error && !account && (
          <p className="text-sm text-(--color-text-secondary)">Carregando dados da conta...</p>
        )}

        {!error && account && (
          <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-panel)">
            <dl className="divide-y divide-(--color-border)">
              <div className="flex items-center justify-between px-4 py-3.5">
                <dt className="text-sm text-(--color-text-secondary)">Nome</dt>
                <dd className="text-sm text-(--color-text)">{account.name}</dd>
              </div>
              <div className="flex items-center justify-between px-4 py-3.5">
                <dt className="text-sm text-(--color-text-secondary)">Perfil</dt>
                <dd className="text-sm text-(--color-text)">{ROLE_LABEL[account.role]}</dd>
              </div>
              <div className="flex items-center justify-between px-4 py-3.5">
                <dt className="text-sm text-(--color-text-secondary)">E-mail</dt>
                <dd className="text-sm text-(--color-text)">{account.email}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
