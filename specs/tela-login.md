Intenção
Criar uma tela de login consumindo a API do projeto (POST /auth/login).

Spec
- Tela dividida ao meio: lado esquerdo mensagem de boas-vindas + logo (ex: "Venha realizar seu
  corte de cabelo de forma rápida e eficaz"), lado direito formulário de login (campos email e
  password).
- Logo: gerar ícone placeholder (estilo navalha cruzada + bigode).
- Contrato da API: POST /auth/login, body { email, password }, sucesso retorna { accessToken }.
- Pós-login: salvar accessToken em localStorage, redirecionar para /dashboard.
- Erro de credenciais inválidas: API retorna 401 — exibir mensagem "email ou senha incorretos".
- Validação client-side: email em formato válido, senha obrigatória — mensagem abaixo do campo.
- Loading: desabilitar botão + spinner durante a requisição.
- Responsivo: em mobile, ocultar painel esquerdo (mensagem/logo), mostrar só o formulário
  centralizado.
- Incluir link "criar conta" direcionando para /register.
- Fora de escopo: "esqueci senha" não faz parte desta tela.

Paleta de cores: #4AD66D (destaque), #232323 (fundo escuro/texto), #CACACA (neutro/texto
secundário).

Stack: React (SPA) + Tailwind CSS.