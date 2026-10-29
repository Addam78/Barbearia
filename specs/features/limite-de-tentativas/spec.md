## Intenção
Dificultar tentativa e erro (força bruta) contra as rotas públicas de
autenticação, que hoje aceitam quantas requisições o cliente quiser:
`POST /auth/login` (adivinhar senhas), `POST /auth/register` (criar
contas em massa) e `POST /auth/accept-invite` (adivinhar tokens de
convite).

## Comportamento
- Limite **por IP**, em janela de 1 minuto, com `@nestjs/throttler`:

| Rota | Limite por minuto |
|---|---|
| `POST /auth/login` | 10 |
| `POST /auth/register` | 5 |
| `POST /auth/accept-invite` | 10 |
| demais rotas | 100 |
| `GET /health` | sem limite |

- Acima do limite: **429 Too Many Requests**. O contador reinicia
  sozinho ao fim da janela.
- `/health` fica de fora: o Render chama essa rota a cada poucos
  segundos e ela não pode ser barrada.
- O limite só vale para HTTP. Os handlers de mensageria (`@RabbitSubscribe`,
  o worker de e-mail) não passam pelo limite (mesmo cuidado do
  `JwtAuthGuard`).
- O guard de limite é o primeiro dos guards globais, para barrar o excesso
  antes de validar token.

## IP real atrás do proxy
Atrás do proxy do Render, sem configuração todo mundo "chega" do IP do
proxy e todos dividem o mesmo limite. Em produção a API confia em **1
proxy** (`app.set('trust proxy', 1)`); localmente, em nenhum, para ninguém
forjar o IP com `X-Forwarded-For`. Ajustável por `TRUST_PROXY_HOPS`.

Como conferir depois do deploy: estourar o limite de login a partir de
uma rede e testar de outra (por exemplo, o celular no 4G). Se a segunda
também for barrada, o IP está chegando errado e o `TRUST_PROXY_HOPS`
precisa de ajuste.

## Frontend
Login, cadastro e aceite de convite mostram "Muitas tentativas. Aguarde
um minuto e tente de novo." quando recebem 429.

## Testes
- e2e (`test/throttle.e2e-spec.ts`): o 11º login e o 6º cadastro viram
  429; `/health` aguenta 120 chamadas seguidas.
- Nos demais e2e o limite fica desligado (`skipIf` em `NODE_ENV=test`),
  porque dezenas de logins partem do mesmo IP. O teste de limite o liga
  com `THROTTLE_E2E=1`.

## Trade-offs e limites conhecidos
- Quem divide um IP (escritório, rede de faculdade) divide o limite.
- O contador fica **na memória** da API: serve para uma instância (o
  plano gratuito do Render). Com várias instâncias, cada uma contaria
  separado, e seria preciso um armazenamento compartilhado (por exemplo,
  Redis).
- Limitar por IP não substitui bloquear por conta (várias tentativas na
  mesma conta, vindas de IPs diferentes). Fora de escopo.

## Stack
NestJS + `@nestjs/throttler` (v6), com `AppThrottlerGuard` em
`src/auth/guards/throttler.guard.ts`.
