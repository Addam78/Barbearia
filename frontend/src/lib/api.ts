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

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

/** Rota pública: cria sempre uma conta CLIENT. Sem sessão após o cadastro — o usuário faz login em seguida. */
export async function register(payload: RegisterPayload): Promise<void> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 409) {
      throw new ApiError(409, 'Este e-mail já está cadastrado.');
    }
    throw new ApiError(response.status, 'Não foi possível criar a conta agora. Tente novamente.');
  }
}

/** Rota pública: o usuário convidado ainda não tem sessão, então não passa por apiFetch. */
export async function acceptInvite(token: string, password: string): Promise<void> {
  const response = await fetch(`${API_URL}/auth/accept-invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, password }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new ApiError(
        401,
        'Este convite é inválido ou já foi utilizado. Peça um novo convite ao administrador.',
      );
    }
    throw new ApiError(response.status, 'Não foi possível definir a senha agora. Tente novamente.');
  }
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

export type Service = {
  id: string;
  name: string;
  price: string;
  durationMinutes: number;
  active: boolean;
};

/**
 * Lista paginada de serviços, com busca opcional por nome. O backend já
 * escopa por role: CLIENT só recebe ativos, BARBER/ADMIN recebem todos.
 */
export function getServices(page = 1, limit = 10, name = '') {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (name) params.set('name', name);
  return apiFetchJson<Paginated<Service>>(`/services?${params.toString()}`);
}

export type NamedUser = NamedRef;

/** Lista de barbeiros (nome/id) — o CLIENT só pode chamar GET /users com esse filtro. */
export function getBarbers() {
  return apiFetchJson<Paginated<NamedUser>>('/users?role=BARBER&limit=100');
}

/** Lista de clientes (nome/id) — usado por BARBER/ADMIN pra agendar em nome de um cliente. */
export function getClients() {
  return apiFetchJson<Paginated<NamedUser>>('/users?role=CLIENT&limit=100');
}

export type Role = 'CLIENT' | 'BARBER' | 'ADMIN';

export type Account = NamedRef & {
  email: string;
  role: Role;
};

/** Dados do próprio usuário (qualquer role pode consultar a própria conta). */
export function getUser(id: string) {
  return apiFetchJson<Account>(`/users/${id}`);
}

export type Availability = {
  date: string;
  barberId: string;
  serviceId: string;
  slots: string[];
};

/** Horários livres de um barbeiro em um dia, considerando a duração do serviço escolhido. */
export function getAvailability(barberId: string, date: string, serviceId: string) {
  const params = new URLSearchParams({ barberId, date, serviceId });
  return apiFetchJson<Availability>(`/appointments/availability?${params.toString()}`);
}

export type CreateAppointmentPayload = {
  clientId?: string;
  barberId: string;
  serviceId: string;
  scheduledAt: string;
};

export function createAppointment(payload: CreateAppointmentPayload) {
  return apiFetchJson<Appointment>('/appointments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export type UpdateAppointmentPayload = {
  status?: AppointmentStatus;
  scheduledAt?: string;
  barberId?: string;
  serviceId?: string;
};

export function updateAppointment(id: string, payload: UpdateAppointmentPayload) {
  return apiFetchJson<Appointment>(`/appointments/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
}

export function cancelAppointment(id: string) {
  return updateAppointment(id, { status: 'CANCELLED' });
}
