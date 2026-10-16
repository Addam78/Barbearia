// A barbearia funciona no horário de Brasília. A API devolve instantes em ISO/UTC,
// então toda exibição converte explicitamente para esse fuso (independe do fuso do navegador).
export const BARBERSHOP_TIME_ZONE = 'America/Sao_Paulo';

export function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BARBERSHOP_TIME_ZONE,
  });
}

export function formatSlotLabel(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: BARBERSHOP_TIME_ZONE,
  });
}

/** Data de hoje (YYYY-MM-DD) no horário de Brasília — toISOString() daria o dia seguinte depois das 21h. */
export function todayISODate() {
  // en-CA formata como YYYY-MM-DD
  return new Intl.DateTimeFormat('en-CA', { timeZone: BARBERSHOP_TIME_ZONE }).format(new Date());
}
