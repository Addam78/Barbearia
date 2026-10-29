## Intenção
Manter a barra lateral (e o botão **Sair**) sempre visíveis, independente
do tamanho da janela e do tamanho do conteúdo.

Hoje a barra lateral só tem `min-h-screen`: ela cresce junto com o
conteúdo da página. Com uma lista longa, ou numa janela baixa, o nome do
usuário e o botão "Sair" ficam no fim da página, fora da vista.

## Comportamento
- A barra lateral ocupa exatamente a altura da tela e **não rola junto**
  com a página (`sticky top-0 h-screen`).
- O conteúdo (`main`) rola sozinho; a barra permanece parada.
- Nome, perfil e botão **Sair** ficam sempre no rodapé da barra,
  visíveis.
- Em janelas muito baixas, onde nem a barra cabe, ela ganha rolagem
  interna em vez de cortar o botão.
- A largura (`w-64`) não encolhe quando o conteúdo é largo (`shrink-0`).

## Fora de escopo
- Versão mobile (menu retrátil). O layout continua pensado para
  desktop.

## Visual
Nenhuma decisão visual nova: só a posição da barra muda. Mesmos tokens
de `.claude/skills/design-frontend/SKILL.md`.

## Stack
React (SPA) + Tailwind CSS, apenas em `components/AppLayout.tsx`.
