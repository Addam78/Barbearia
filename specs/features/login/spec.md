## Intenção
Criar uma tela de login consumindo a API do projeto (POST /auth/login).

## Comportamento
- Tela dividida ao meio: lado esquerdo painel de destaque (marca +
  mensagem), lado direito formulário de login.
- Contrato da API: POST /auth/login, body { email, password }, sucesso
  retorna { accessToken }.
- Pós-login: salvar accessToken em localStorage, redirecionar para
  /dashboard.
- Erro de credenciais inválidas: API retorna 401 — exibir "email ou
  senha incorretos".
- Validação client-side: email em formato válido, senha obrigatória.
- Loading: desabilitar botão + spinner durante a requisição.
- Responsivo: em mobile, ocultar painel de destaque, mostrar só o
  formulário centralizado.
- Incluir link "criar conta" direcionando para /register.
- Fora de escopo: "esqueci senha" não faz parte desta tela.

## Visual
Não especificado aqui — segue .claude/skills/design-system-barbearia.md

## Stack
React (SPA) + Tailwind CSS (ou CSS puro/CSS modules, conforme o projeto)