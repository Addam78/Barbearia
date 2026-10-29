/** Classes compartilhadas pelos formulários e botões das telas internas, iguais às das telas já existentes. */
export const INPUT_CLASS =
  'w-full rounded-lg border border-(--color-border) bg-(--color-bg) px-4 py-2 text-sm text-(--color-text) outline-none transition-shadow focus:border-(--color-accent) focus:shadow-[0_0_0_3px_rgba(201,162,39,0.15)]';

export const PRIMARY_BUTTON_CLASS =
  'flex items-center justify-center gap-2 rounded-md bg-(--color-primary) px-4 py-2 text-sm font-medium text-(--color-text) transition-all hover:-translate-y-px hover:bg-(--color-primary-hover) hover:shadow-[0_12px_24px_-8px_rgba(140,58,43,0.55)] active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none';

export const SECONDARY_BUTTON_CLASS =
  'rounded-md border border-(--color-border) px-4 py-2 text-sm text-(--color-text-secondary) transition-colors hover:border-(--color-accent) hover:text-(--color-text) disabled:opacity-60';
