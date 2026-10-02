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
      {/* Painel esquerdo: some no mobile */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-(--color-panel) px-16">
        <Mark className="h-10 w-10 text-(--color-accent)" />
        <h1 className="mt-10 max-w-sm font-[family-name:var(--font-display)] text-[40px] leading-[1.15] font-medium text-(--color-text)">
          Venha realizar seu corte de cabelo de forma rápida e eficaz.
        </h1>
      </div>

      {/* Painel direito: formulário */}
      <div className="flex w-full lg:w-1/2 flex-col justify-center px-6 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <Mark className="h-8 w-8 text-(--color-accent) lg:hidden mb-8" />

          <h2 className="font-[family-name:var(--font-display)] text-[28px] font-medium text-(--color-text)">
            Entrar
          </h2>

          <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
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
                className="rounded-md border border-(--color-border) bg-transparent px-3.5 py-2.5 text-(--color-text) outline-none transition-colors focus:border-(--color-accent)"
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
                className="rounded-md border border-(--color-border) bg-transparent px-3.5 py-2.5 text-(--color-text) outline-none transition-colors focus:border-(--color-accent)"
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
              className="mt-2 flex items-center justify-center gap-2 rounded-md bg-(--color-accent) px-4 py-2.5 font-medium text-(--color-accent-contrast) transition-opacity disabled:opacity-60"
            >
              {isSubmitting && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-(--color-accent-contrast) border-t-transparent" />
              )}
              Entrar
            </button>
          </form>

          <p className="mt-8 text-sm text-(--color-text-secondary)">
            Ainda não tem conta?{' '}
            <Link to="/register" className="text-(--color-text) underline underline-offset-2">
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
