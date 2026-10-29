import { useState, type FormEvent } from 'react';
import { ApiError, SessionExpiredError, createService, updateService, type Service } from '../lib/api';
import { useAuth } from '../lib/auth';
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '../lib/ui';
import { Modal } from './Modal';

/** Modal de criar (sem `service`) ou editar (com `service`) um serviço. */
export function ServiceFormModal({
  service,
  onClose,
  onSaved,
}: {
  service?: Service;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { handleSessionExpired } = useAuth();
  const [name, setName] = useState(service?.name ?? '');
  const [price, setPrice] = useState(service ? String(Number(service.price)) : '');
  const [duration, setDuration] = useState(service ? String(service.durationMinutes) : '');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const priceText = price.trim();
    const priceValue = Number(priceText.replace(',', '.'));
    const durationValue = Number(duration);

    if (!trimmedName) {
      setError('Informe o nome do serviço.');
      return;
    }
    // Valida o texto digitado (não a conta com float): só dígitos, com até 2 casas depois de ponto ou vírgula.
    if (!/^\d+([.,]\d{1,2})?$/.test(priceText) || priceValue <= 0) {
      setError('Informe um preço maior que zero, com até 2 casas decimais.');
      return;
    }
    if (!Number.isInteger(durationValue) || durationValue < 1 || durationValue > 1440) {
      setError('Informe a duração em minutos (número inteiro, de 1 a 1440).');
      return;
    }

    setSubmitting(true);
    const payload = { name: trimmedName, price: priceValue, durationMinutes: durationValue };

    try {
      if (service) {
        await updateService(service.id, payload);
      } else {
        await createService(payload);
      }
      onSaved();
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        setError('Já existe um serviço com esse nome.');
      } else if (err instanceof ApiError && err.status === 400) {
        setError('Confira os dados informados.');
      } else {
        setError('Não foi possível salvar o serviço agora.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={service ? 'Editar serviço' : 'Novo serviço'} onClose={onClose}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor="service-name" className="mb-1.5 block text-sm text-(--color-text-secondary)">
            Nome
          </label>
          <input
            id="service-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Corte simples"
            autoFocus
            className={INPUT_CLASS}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="service-price" className="mb-1.5 block text-sm text-(--color-text-secondary)">
              Preço (R$)
            </label>
            <input
              id="service-price"
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              placeholder="35,00"
              className={INPUT_CLASS}
            />
          </div>
          <div>
            <label htmlFor="service-duration" className="mb-1.5 block text-sm text-(--color-text-secondary)">
              Duração (min)
            </label>
            <input
              id="service-duration"
              type="text"
              inputMode="numeric"
              value={duration}
              onChange={(event) => setDuration(event.target.value)}
              placeholder="30"
              className={INPUT_CLASS}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-(--color-error)">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-3">
          <button type="button" onClick={onClose} disabled={submitting} className={SECONDARY_BUTTON_CLASS}>
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className={PRIMARY_BUTTON_CLASS}>
            {submitting ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
