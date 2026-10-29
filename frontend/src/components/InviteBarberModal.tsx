import { useState, type FormEvent } from 'react';
import { ApiError, SessionExpiredError, createUser } from '../lib/api';
import { useAuth } from '../lib/auth';
import { INPUT_CLASS, PRIMARY_BUTTON_CLASS, SECONDARY_BUTTON_CLASS } from '../lib/ui';
import { Modal } from './Modal';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Modal de convite de barbeiro: o admin informa nome e e-mail, e a pessoa define a senha pelo link do e-mail. */
export function InviteBarberModal({ onClose, onInvited }: { onClose: () => void; onInvited: () => void }) {
  const { handleSessionExpired } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError('');

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('Informe o nome do barbeiro.');
      return;
    }
    if (!EMAIL_PATTERN.test(trimmedEmail)) {
      setError('Informe um e-mail válido.');
      return;
    }

    setSubmitting(true);

    try {
      await createUser({ name: trimmedName, email: trimmedEmail, role: 'BARBER' });
      setInvitedEmail(trimmedEmail);
      onInvited();
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        setError('Já existe um usuário com esse e-mail.');
      } else if (err instanceof ApiError && err.status === 400) {
        setError('Confira o nome e o e-mail informados.');
      } else {
        setError('Não foi possível enviar o convite agora.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (invitedEmail) {
    return (
      <Modal title="Convite enviado" onClose={onClose}>
        <p className="text-sm text-(--color-text)">
          Convite enviado para <strong>{invitedEmail}</strong>.
        </p>
        <p className="mt-2 text-sm text-(--color-text-secondary)">
          A pessoa define a senha pelo link do e-mail. O envio é feito em segundo plano e pode levar alguns instantes.
        </p>
        <div className="mt-5 flex justify-end">
          <button type="button" onClick={onClose} className={PRIMARY_BUTTON_CLASS}>
            Fechar
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      title="Convidar barbeiro"
      subtitle="A conta é criada sem senha. A pessoa recebe um e-mail e escolhe a própria senha."
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <div>
          <label htmlFor="invite-name" className="mb-1.5 block text-sm text-(--color-text-secondary)">
            Nome
          </label>
          <input
            id="invite-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Carlos Barbeiro"
            autoFocus
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label htmlFor="invite-email" className="mb-1.5 block text-sm text-(--color-text-secondary)">
            E-mail
          </label>
          <input
            id="invite-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="carlos@barbearia.com"
            className={INPUT_CLASS}
          />
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
            {submitting ? 'Enviando...' : 'Enviar convite'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
