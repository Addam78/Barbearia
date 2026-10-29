import { useCallback, useEffect, useState } from 'react';
import { ServiceFormModal } from '../components/ServiceFormModal';
import { ApiError, SessionExpiredError, getServices, updateService, type Service } from '../lib/api';
import { useAuth } from '../lib/auth';
import { PRIMARY_BUTTON_CLASS } from '../lib/ui';

const LIMIT = 10;

function formatPrice(price: Service['price']) {
  return Number(price).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function ServicesPage() {
  const { role, handleSessionExpired } = useAuth();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<{ data: Service[]; totalPages: number } | null>(null);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [actionError, setActionError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  // `undefined` = modal fechado; `null` = criando; um serviço = editando.
  const [editing, setEditing] = useState<Service | null | undefined>(undefined);

  const canManage = role === 'BARBER' || role === 'ADMIN';

  const reload = useCallback(() => setReloadKey((current) => current + 1), []);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    let active = true;
    setResult(null);
    setError('');

    const timeout = setTimeout(() => {
      getServices(page, LIMIT, search.trim())
        .then((response) => {
          if (active) setResult({ data: response.data, totalPages: response.totalPages });
        })
        .catch((err) => {
          if (!active) return;
          if (err instanceof SessionExpiredError) {
            handleSessionExpired();
            return;
          }
          setError(err instanceof ApiError ? err.message : 'Não foi possível carregar os serviços.');
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timeout);
    };
  }, [page, search, reloadKey, handleSessionExpired]);

  async function handleToggleActive(service: Service) {
    if (
      service.active &&
      !window.confirm(
        'Desativar este serviço? Ele some para os clientes e não aceita novos agendamentos. Os agendamentos antigos continuam.',
      )
    ) {
      return;
    }

    setActionError('');
    setBusyId(service.id);

    try {
      await updateService(service.id, { active: !service.active });
      reload();
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }
      setActionError(
        service.active ? 'Não foi possível desativar o serviço agora.' : 'Não foi possível reativar o serviço agora.',
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-[family-name:var(--font-display)] text-[28px] font-medium text-(--color-text)">
          Serviços
        </h1>

        {canManage && (
          <button type="button" onClick={() => setEditing(null)} className={PRIMARY_BUTTON_CLASS}>
            Novo serviço
          </button>
        )}
      </div>

      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Buscar serviço por nome..."
        className="mt-6 w-full max-w-sm rounded-lg border border-(--color-border) bg-(--color-panel) px-4 py-2 text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
      />

      <div className="mt-6">
        {error && <p className="text-sm text-(--color-error)">{error}</p>}
        {actionError && (
          <p role="alert" className="mb-3 text-sm text-(--color-error)">
            {actionError}
          </p>
        )}

        {!error && !result && <p className="text-sm text-(--color-text-secondary)">Carregando serviços...</p>}

        {!error && result && result.data.length === 0 && search && (
          <p className="text-sm text-(--color-text-secondary)">
            Nenhum serviço encontrado para &quot;{search}&quot;.
          </p>
        )}

        {!error && result && result.data.length === 0 && !search && (
          <p className="text-sm text-(--color-text-secondary)">Nenhum serviço cadastrado.</p>
        )}

        {!error && result && result.data.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-(--color-border) bg-(--color-panel)">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-(--color-border) text-(--color-text-secondary)">
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Preço</th>
                  <th className="px-4 py-3 font-medium">Duração</th>
                  {canManage && <th className="px-4 py-3 font-medium">Status</th>}
                  {canManage && <th className="px-4 py-3 font-medium">Ações</th>}
                </tr>
              </thead>
              <tbody>
                {result.data.map((service) => (
                  <tr key={service.id} className="border-b border-(--color-border) last:border-0">
                    <td className="px-4 py-3 text-(--color-text)">{service.name}</td>
                    <td className="px-4 py-3 text-(--color-text-secondary)">{formatPrice(service.price)}</td>
                    <td className="px-4 py-3 text-(--color-text-secondary)">{service.durationMinutes} min</td>
                    {canManage && (
                      <td className="px-4 py-3">
                        {!service.active && (
                          <span className="rounded-full border border-(--color-border) px-2.5 py-1 text-xs text-(--color-text-secondary)">
                            Inativo
                          </span>
                        )}
                      </td>
                    )}
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-4">
                          <button
                            type="button"
                            onClick={() => setEditing(service)}
                            className="text-(--color-accent) hover:underline"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleActive(service)}
                            disabled={busyId === service.id}
                            className={`hover:underline disabled:opacity-50 ${
                              service.active ? 'text-(--color-error)' : 'text-(--color-accent)'
                            }`}
                          >
                            {service.active ? 'Desativar' : 'Reativar'}
                          </button>
                        </div>
                      </td>
                    )}
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

      {editing !== undefined && (
        <ServiceFormModal
          service={editing ?? undefined}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            reload();
          }}
        />
      )}
    </div>
  );
}
