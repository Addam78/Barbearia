import { useEffect, type ReactNode } from 'react';

/** Modal simples (mesmo visual do modal de reagendamento): fundo escurecido, painel centralizado, Esc fecha. */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-xl border border-(--color-border) bg-(--color-panel) p-6 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)]">
        <h2 className="font-[family-name:var(--font-display)] text-lg text-(--color-text)">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-(--color-text-secondary)">{subtitle}</p>}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
