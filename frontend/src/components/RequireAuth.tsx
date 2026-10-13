import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { defaultRouteFor, useAuth, type Role } from '../lib/auth';

type RequireAuthProps = {
  children: ReactNode;
  /** Roles permitidas nesta rota. Sem essa prop, qualquer usuário autenticado acessa. */
  allow?: Role[];
};

/**
 * Protege a rota: sem token válido, redireciona pro /login. Autenticado mas
 * sem a role exigida, redireciona pra rota padrão do próprio perfil (não é
 * 404 nem tela de erro).
 */
export function RequireAuth({ children, allow }: RequireAuthProps) {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" replace />;
  }

  if (allow && !allow.includes(role)) {
    return <Navigate to={defaultRouteFor(role)} replace />;
  }

  return children;
}
