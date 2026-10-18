import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Mark } from '../components/Mark';
import { ApiError, acceptInvite } from '../lib/api';

const MIN_PASSWORD_LENGTH = 6;

const inputClass =
  'rounded-md border border-(--color-border) bg-(--color-bg) px-3.5 py-2.5 text-(--color-text) outline-none transition-all focus:border-(--color-accent) focus:shadow-[0_0_0_3px_rgba(201,162,39,0.15)]';

const primaryButtonClass =
  'mt-2 flex items-center justify-center gap-2 rounded-md bg-(--color-primary) px-4 py-2.5 font-medium text-(--color-text) transition-all hover:-translate-y-px hover:bg-(--color-primary-hover) hover:shadow-[0_12px_24px_-8px_rgba(140,58,43,0.55)] active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none';

export function AcceptInvitePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmError, setConfirmError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDone, setIsDone] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError('');

    const nextPasswordError =
      password.length >= MIN_PASSWORD_LENGTH ? '' : `A senha precisa ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`;
    const nextConfirmError = confirmPassword === password ? '' : 'As senhas não são iguais.';
    setPasswordError(nextPasswordError);
    setConfirmError(nextConfirmError);

    if (nextPasswordError || nextConfirmError) return;

    setIsSubmitting(true);
    try {
      await acceptInvite(token, password);
      setIsDone(true);
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Algo deu errado. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-(--color-bg) text-(--color-text)">
      {/* Painel de destaque: some no mobile */}
      <div className="relative hidden lg:flex lg:w-1/2 flex-col justify-between overflow-hidden bg-(--color-panel) px-16 py-16">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -left-40 -top-40 h-[560px] w-[560px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(140,58,43,0.55), transparent 70%)' }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-48 -right-48 h-[560px] w-[560px] rounded-full blur-3xl"
          style={{ background: 'radial-gradient(circle, rgba(201,162,39,0.35), transparent 70%)' }}
        />
        <Mark className="pointer-events-none absolute -bottom-6 -right-6 h-[380px] w-[380px] text-(--color-accent) opacity-[0.14]" />

        <div className="relative flex items-center gap-2">
          <Mark className="h-7 w-7 text-(--color-accent)" />
          <span className="font-[family-name:var(--font-display)] text-lg text-(--color-text)">
            Fio &amp; Navalha
          </span>
        </div>

        <div className="relative max-w-sm">
          <h1 className="font-[family-name:var(--font-display)] text-[40px] leading-[1.15] font-medium text-(--color-text)">
            Bem-vindo à equipe.
          </h1>
          <p className="mt-4 text-(--color-text-secondary)">
            Defina sua senha para acessar a agenda e começar a atender.
          </p>
        </div>

        <div className="relative h-6" />
      </div>

      {/* Painel direito: formulário */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 sm:px-16">
        <div className="mx-auto w-full max-w-sm rounded-2xl border border-(--color-border) bg-(--color-panel) p-8 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)]">
          <Mark className="h-8 w-8 text-(--color-accent) lg:hidden mb-6" />

          {!token && (
            <>
              <h2 className="font-[family-name:var(--font-display)] text-[28px] font-medium text-(--color-text)">
                Link de convite inválido
              </h2>
              <p className="mt-2 text-sm text-(--color-text-secondary)">
                Este link está incompleto. Abra de novo o link que veio no seu e-mail ou peça um novo convite ao
                administrador.
              </p>
              <Link to="/login" className={`${primaryButtonClass} mt-6`}>
                Ir para o login
              </Link>
            </>
          )}

          {token && isDone && (
            <>
              <h2 className="font-[family-name:var(--font-display)] text-[28px] font-medium text-(--color-text)">
                Senha definida
              </h2>
              <p role="status" className="mt-2 text-sm text-(--color-text-secondary)">
                Tudo pronto. Agora você já pode entrar com o seu e-mail e a senha que acabou de escolher.
              </p>
              <Link to="/login" className={`${primaryButtonClass} mt-6`}>
                Ir para o login
              </Link>
            </>
          )}

          {token && !isDone && (
            <>
              <h2 className="font-[family-name:var(--font-display)] text-[28px] font-medium text-(--color-text)">
                Defina sua senha
              </h2>
              <p className="mt-2 text-sm text-(--color-text-secondary)">
                Escolha a senha que você vai usar para entrar na plataforma.
              </p>

              <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-sm text-(--color-text-secondary)">
                    Nova senha
                  </label>
                  <input
                    id="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className={inputClass}
                    aria-invalid={Boolean(passwordError)}
                    aria-describedby={passwordError ? 'password-error' : undefined}
                  />
                  {passwordError && (
                    <p id="password-error" className="text-sm text-(--color-error)">
                      {passwordError}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm-password" className="text-sm text-(--color-text-secondary)">
                    Confirmar senha
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className={inputClass}
                    aria-invalid={Boolean(confirmError)}
                    aria-describedby={confirmError ? 'confirm-password-error' : undefined}
                  />
                  {confirmError && (
                    <p id="confirm-password-error" className="text-sm text-(--color-error)">
                      {confirmError}
                    </p>
                  )}
                </div>

                {formError && (
                  <p role="alert" className="text-sm text-(--color-error)">
                    {formError}
                  </p>
                )}

                <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
                  {isSubmitting && (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-(--color-text) border-t-transparent" />
                  )}
                  Definir senha
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-(--color-text-secondary)">
                Já definiu sua senha?{' '}
                <Link to="/login" className="text-(--color-accent) underline underline-offset-2">
                  Entrar
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
