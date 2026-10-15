import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  getUser,
  login as loginRequest,
  logoutRequest,
  saveTokens,
} from './api';

export type Role = 'CLIENT' | 'BARBER' | 'ADMIN';

type JwtPayload = {
  sub: string;
  role: Role;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  userId: string | null;
  role: Role | null;
  name: string | null;
  login: (email: string, password: string) => Promise<Role>;
  logout: () => Promise<void>;
  /** Chamado quando a sessão expira de verdade (refresh falhou) — limpa estado local. */
  handleSessionExpired: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Decodifica o payload do JWT localmente (base64 — atob), sem lib externa e sem chamar a API. */
function decodeJwt(token: string): JwtPayload | null {
  try {
    const [, payloadBase64] = token.split('.');
    if (!payloadBase64) return null;
    const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      atob(normalized)
        .split('')
        .map((char) => '%' + char.charCodeAt(0).toString(16).padStart(2, '0'))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [payload, setPayload] = useState<JwtPayload | null>(() => {
    const token = getAccessToken();
    return token ? decodeJwt(token) : null;
  });
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!payload) {
      setName(null);
      return;
    }

    let active = true;
    getUser(payload.sub)
      .then((user) => {
        if (active) setName(user.name);
      })
      .catch(() => {
        if (active) setName(null);
      });

    return () => {
      active = false;
    };
  }, [payload]);

  async function login(email: string, password: string) {
    const tokens = await loginRequest({ email, password });
    saveTokens(tokens);
    const decoded = decodeJwt(tokens.accessToken);
    setPayload(decoded);
    if (!decoded) {
      throw new Error('Não foi possível interpretar o token recebido.');
    }
    return decoded.role;
  }

  async function logout() {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await logoutRequest(refreshToken);
    }
    clearTokens();
    setPayload(null);
  }

  function handleSessionExpired() {
    clearTokens();
    setPayload(null);
  }

  const value = useMemo<AuthContextValue>(
    () => ({
      isAuthenticated: payload !== null,
      userId: payload?.sub ?? null,
      role: payload?.role ?? null,
      name,
      login,
      logout,
      handleSessionExpired,
    }),
    [payload, name],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um AuthProvider.');
  }
  return context;
}

/** Rota padrão de cada perfil, usada pelo guard quando a role não tem acesso à rota pedida. */
export function defaultRouteFor(role: Role) {
  if (role === 'BARBER' || role === 'ADMIN') return '/dashboard';
  return '/meus-agendamentos';
}
