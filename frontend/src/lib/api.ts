const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

/** Sinaliza que a sessão acabou de verdade (refresh falhou) — quem ouvir deve redirecionar pro login. */
export class SessionExpiredError extends Error {
  constructor() {
    super('Sessão expirada. Faça login novamente.');
  }
}

type LoginPayload = {
  email: string;
  password: string;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveTokens(tokens: TokenPair) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export async function login(payload: LoginPayload): Promise<TokenPair> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new ApiError(401, 'E-mail ou senha incorretos.');
    }
    throw new ApiError(response.status, 'Não foi possível entrar agora. Tente novamente.');
  }

  return response.json();
}

export async function refresh(refreshToken: string): Promise<TokenPair> {
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    throw new ApiError(response.status, 'Não foi possível renovar a sessão.');
  }

  return response.json();
}

export async function logoutRequest(refreshToken: string): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  } catch {
    // Logout é best-effort no front: mesmo se a chamada falhar, os tokens locais são limpos.
  }
}

/**
 * Wrapper de fetch autenticado: injeta o Bearer do accessToken guardado e,
 * em caso de 401, tenta renovar via refresh token automaticamente UMA vez
 * antes de desistir. Se o refresh falhar, lança SessionExpiredError pra
 * quem estiver ouvindo (ex: o contexto de autenticação) redirecionar pro login.
 */
export async function apiFetch(path: string, options: RequestInit = {}, _retry = false): Promise<Response> {
  const accessToken = getAccessToken();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
  });

  if (response.status === 401 && !_retry) {
    const refreshToken = getRefreshToken();
    if (!refreshToken) {
      clearTokens();
      throw new SessionExpiredError();
    }

    try {
      const tokens = await refresh(refreshToken);
      saveTokens(tokens);
    } catch {
      clearTokens();
      throw new SessionExpiredError();
    }

    return apiFetch(path, options, true);
  }

  return response;
}

export async function apiFetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await apiFetch(path, options);

  if (!response.ok) {
    throw new ApiError(response.status, 'Não foi possível completar a requisição.');
  }

  return response.json();
}

export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

type NamedRef = {
  id: string;
  name: string;
};

export type Appointment = {
  id: string;
  clientId: string;
  barberId: string;
  serviceId: string;
  scheduledAt: string;
  status: AppointmentStatus;
  client: NamedRef;
  barber: NamedRef;
  service: NamedRef;
};

export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

/**
 * Lista paginada de agendamentos, já escopada pelo backend conforme a role
 * do usuário autenticado (CLIENT só os próprios, BARBER só a própria agenda,
 * ADMIN todos).
 */
export function getAppointments(page = 1, limit = 10) {
  return apiFetchJson<Paginated<Appointment>>(`/appointments?page=${page}&limit=${limit}`);
}
