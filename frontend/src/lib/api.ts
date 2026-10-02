const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type LoginPayload = {
  email: string;
  password: string;
};

type LoginResponse = {
  accessToken: string;
};

export async function login(payload: LoginPayload): Promise<LoginResponse> {
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
