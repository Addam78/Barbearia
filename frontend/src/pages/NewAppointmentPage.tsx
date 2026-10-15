import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ApiError,
  SessionExpiredError,
  createAppointment,
  getAvailability,
  getBarbers,
  getClients,
  getServices,
  type NamedUser,
  type Service,
} from '../lib/api';
import { useAuth } from '../lib/auth';

function formatSlotLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
}

function todayISODate() {
  return new Date().toISOString().slice(0, 10);
}

export function NewAppointmentPage() {
  const { role, handleSessionExpired } = useAuth();
  const navigate = useNavigate();
  const canPickClient = role === 'BARBER' || role === 'ADMIN';

  const [services, setServices] = useState<Service[] | null>(null);
  const [barbers, setBarbers] = useState<NamedUser[] | null>(null);
  const [clients, setClients] = useState<NamedUser[] | null>(null);

  const [serviceId, setServiceId] = useState('');
  const [barberId, setBarberId] = useState('');
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(todayISODate());
  const [selectedSlot, setSelectedSlot] = useState('');

  const [slots, setSlots] = useState<string[] | null>(null);
  const [slotsError, setSlotsError] = useState('');

  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    getServices(1, 100).then((result) => setServices(result.data.filter((service) => service.active)));
    getBarbers().then((result) => setBarbers(result.data));
    if (canPickClient) {
      getClients().then((result) => setClients(result.data));
    }
  }, [canPickClient]);

  useEffect(() => {
    setSelectedSlot('');
    setSlots(null);
    setSlotsError('');

    if (!serviceId || !barberId || !date) return;

    let active = true;
    getAvailability(barberId, date, serviceId)
      .then((result) => {
        if (active) setSlots(result.slots);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof SessionExpiredError) {
          handleSessionExpired();
          return;
        }
        setSlotsError(err instanceof ApiError ? err.message : 'Não foi possível carregar os horários.');
      });

    return () => {
      active = false;
    };
  }, [serviceId, barberId, date, handleSessionExpired]);

  async function handleConfirm() {
    setSubmitError('');
    setSubmitting(true);

    try {
      await createAppointment({
        barberId,
        serviceId,
        scheduledAt: selectedSlot,
        ...(canPickClient ? { clientId } : {}),
      });
      navigate('/meus-agendamentos');
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        handleSessionExpired();
        return;
      }
      if (err instanceof ApiError && err.status === 409) {
        setSubmitError('Esse horário acabou de ser ocupado. Escolha outro.');
        setSelectedSlot('');
        getAvailability(barberId, date, serviceId).then((result) => setSlots(result.slots));
      } else {
        setSubmitError(err instanceof ApiError ? err.message : 'Não foi possível agendar agora.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const canConfirm = serviceId && barberId && selectedSlot && (!canPickClient || clientId);

  return (
    <div>
      <h1 className="font-[family-name:var(--font-display)] text-[28px] font-medium text-(--color-text)">
        Agendar
      </h1>

      <div className="mt-6 max-w-lg space-y-5">
        {canPickClient && (
          <div>
            <label className="mb-1.5 block text-sm text-(--color-text-secondary)">Cliente</label>
            <select
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              className="w-full rounded-lg border border-(--color-border) bg-(--color-panel) px-4 py-2 text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
            >
              <option value="">Selecione um cliente</option>
              {clients?.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm text-(--color-text-secondary)">Serviço</label>
          <select
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
            className="w-full rounded-lg border border-(--color-border) bg-(--color-panel) px-4 py-2 text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
          >
            <option value="">Selecione um serviço</option>
            {services?.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ({service.durationMinutes} min)
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-(--color-text-secondary)">Barbeiro</label>
          <select
            value={barberId}
            onChange={(event) => setBarberId(event.target.value)}
            className="w-full rounded-lg border border-(--color-border) bg-(--color-panel) px-4 py-2 text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
          >
            <option value="">Selecione um barbeiro</option>
            {barbers?.map((barber) => (
              <option key={barber.id} value={barber.id}>
                {barber.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-(--color-text-secondary)">Data</label>
          <input
            type="date"
            value={date}
            min={todayISODate()}
            onChange={(event) => setDate(event.target.value)}
            className="w-full rounded-lg border border-(--color-border) bg-(--color-panel) px-4 py-2 text-sm text-(--color-text) outline-none focus:border-(--color-accent)"
          />
        </div>

        {serviceId && barberId && (
          <div>
            <label className="mb-1.5 block text-sm text-(--color-text-secondary)">Horário</label>

            {slotsError && <p className="text-sm text-(--color-error)">{slotsError}</p>}

            {!slotsError && slots === null && (
              <p className="text-sm text-(--color-text-secondary)">Carregando horários...</p>
            )}

            {!slotsError && slots !== null && slots.length === 0 && (
              <p className="text-sm text-(--color-text-secondary)">Nenhum horário disponível nesse dia.</p>
            )}

            {!slotsError && slots !== null && slots.length > 0 && (
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
        )}

        {submitError && <p className="text-sm text-(--color-error)">{submitError}</p>}

        <button
          type="button"
          disabled={!canConfirm || submitting}
          onClick={handleConfirm}
          className="rounded-lg bg-(--color-accent) px-5 py-2.5 text-sm font-medium text-(--color-bg) disabled:opacity-40"
        >
          {submitting ? 'Agendando...' : 'Confirmar agendamento'}
        </button>
      </div>
    </div>
  );
}
