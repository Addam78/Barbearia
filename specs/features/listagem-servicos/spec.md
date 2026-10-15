## Intenção
Criar a tela de listagem de serviços, consumindo `GET /services`, para
substituir o placeholder atual de `ServicesPage`.

## Comportamento
- Lista paginada de serviços, seguindo a paginação do backend
  (`?page=&limit=`, resposta com `data`, `total`, `page`, `limit`,
  `totalPages`).
- Visível para os três perfis (`CLIENT`, `BARBER`, `ADMIN`), cada um
  logado — a regra de quem vê o quê já existe no backend e a tela só
  reflete:
  - `CLIENT` recebe só serviços **ativos**.
  - `BARBER`/`ADMIN` recebem todos, inclusive os desativados; nesse
    caso exibir um indicador visual de "inativo" no card/linha do
    serviço.
- Cada item mostra: nome, preço e duração (minutos).
- Barra de busca por nome, filtrando a lista exibida.
- Se a busca não encontrar nenhum serviço, exibir mensagem informando
  que não existe esse serviço (ex.: "Nenhum serviço encontrado para
  '{busca}'").
- Loading state ao carregar a página (skeleton ou spinner).
- Lista vazia (sem nenhum serviço cadastrado, sem busca ativa): mensagem
  própria, diferente da de busca sem resultado.
- Fora de escopo nesta tela: criar, editar ou desativar serviço (ações
  de `BARBER`/`ADMIN`); agendar um horário a partir do serviço.

## Busca por nome
`GET /services` passou a aceitar `?name=` (filtro `contains`,
case-insensitive, no Prisma), para a busca funcionar corretamente
considerando todos os serviços cadastrados, não só os da página
carregada.

## Visual
Segue `.claude/skills/design-frontend/SKILL.md` (paleta e tipografia
já usadas em `LoginPage`/`AppLayout`).

## Stack
React (SPA) + Tailwind CSS, reaproveitando `AppLayout` e os componentes
já usados nas outras telas internas.
