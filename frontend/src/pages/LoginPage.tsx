import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mark } from '../components/Mark';
import { ApiError, login } from '../lib/api';

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setFormError('');

    const nextEmailError = isValidEmail(email) ? '' : 'Digite um e-mail válido.';
    const nextPasswordError = password ? '' : 'Digite sua senha.';
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);

    if (nextEmailError || nextPasswordError) return;

    setIsSubmitting(true);
    try {
      const { accessToken } = await login({ email, password });
      localStorage.setItem('accessToken', accessToken);
      navigate('/dashboard');
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
            Seu próximo corte começa aqui.
          </h1>
          <p className="mt-4 text-(--color-text-secondary)">
            Agende com os melhores profissionais da casa e acompanhe seus horários sem complicação.
          </p>
        </div>

        <div className="relative flex gap-6 text-sm text-(--color-text-secondary)">
          <p>
            <span className="font-medium text-(--color-accent)">12 anos</span> de ofício
          </p>
          <p>
            <span className="font-medium text-(--color-accent)">4 unidades</span> na cidade
          </p>
        </div>
      </div>

      {/* Painel direito: formulário */}
      <div className="flex w-full lg:w-1/2 flex-col items-center justify-center px-6 sm:px-16">
        <div className="mx-auto w-full max-w-sm rounded-2xl border border-(--color-border) bg-(--color-panel) p-8 shadow-[0_24px_60px_-24px_rgba(0,0,0,0.55)]">
          <Mark className="h-8 w-8 text-(--color-accent) lg:hidden mb-6" />

          <h2 className="font-[family-name:var(--font-display)] text-[28px] font-medium text-(--color-text)">
            Entrar
          </h2>
          <p className="mt-2 text-sm text-(--color-text-secondary)">
            Acesse sua conta para agendar ou gerenciar seus horários.
          </p>

          <form className="mt-6 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm text-(--color-text-secondary)">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="seu@email.com"
                className="rounded-md border border-(--color-border) bg-(--color-bg) px-3.5 py-2.5 text-(--color-text) outline-none transition-all focus:border-(--color-accent) focus:shadow-[0_0_0_3px_rgba(201,162,39,0.15)]"
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? 'email-error' : undefined}
              />
              {emailError && (
                <p id="email-error" className="text-sm text-(--color-error)">
                  {emailError}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-sm text-(--color-text-secondary)">
                Senha
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="rounded-md border border-(--color-border) bg-(--color-bg) px-3.5 py-2.5 text-(--color-text) outline-none transition-all focus:border-(--color-accent) focus:shadow-[0_0_0_3px_rgba(201,162,39,0.15)]"
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? 'password-error' : undefined}
              />
              {passwordError && (
                <p id="password-error" className="text-sm text-(--color-error)">
                  {passwordError}
                </p>
              )}
            </div>

            {formError && (
              <p role="alert" className="text-sm text-(--color-error)">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 flex items-center justify-center gap-2 rounded-md bg-(--color-primary) px-4 py-2.5 font-medium text-(--color-text) transition-all hover:-translate-y-px hover:bg-(--color-primary-hover) hover:shadow-[0_12px_24px_-8px_rgba(140,58,43,0.55)] active:translate-y-0 disabled:opacity-60 disabled:hover:translate-y-0 disabled:hover:shadow-none"
            >
              {isSubmitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-(--color-text) border-t-transparent" />
              )}
              Entrar
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-(--color-text-secondary)">
            Ainda não tem conta?{' '}
            <Link to="/register" className="text-(--color-accent) underline underline-offset-2">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
