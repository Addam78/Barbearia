## Paleta (fixa — não redecidir por tela)
- Fundo: #1C1714
- Superfície: #241E19
- Borda de superfície: #3A322A
- Primária: #8C3A2B (CTAs, links, destaque)
- Primária hover: #A3452F
- Acento/latão: #C9A227
- Texto principal: #EDE6DB
- Texto secundário: #A89C8A

## Rationale da paleta
- Oxblood/vermelho-terracota: referência ao poste de barbearia clássico
- Latão/dourado: tradição, precisão, instrumentos
- Evitado de propósito: laranja vibrante (clichê de app genérico do
  nicho) e verde (sem associação natural com barbearia)

## Tipografia
- Display/headline: serifada (Georgia ou equivalente)
- UI/corpo: sans-serif de sistema

## Iconografia
- Ícone oficial da marca: frontend/src/assets/icons/navalha.svg
  (arquivo real, aprovado — NUNCA gerar path à mão por tentativa e erro)
- Uso: recolorir via `fill`/`currentColor`, nunca duplicar o desenho
- Ícones de produto seguem o mesmo peso/estilo do ícone oficial

## Painéis de destaque (hero panels — login, cadastro, recuperar senha)
- Nunca cor sólida plana: sempre glow radial preenchendo o espaço
  - Blob 1: oxblood (rgba(140,58,43,0.55)), canto superior esquerdo
  - Blob 2: latão (rgba(201,162,39,0.35)), canto inferior direito
  - Ambos sangrando pra fora da borda do painel (position absolute,
    parcialmente fora do container, overflow:hidden no painel)
- Ícone da marca em escala grande (~460px) e baixa opacidade (0.14)
  como elemento de fundo, sangrando parcialmente pra fora do painel
- Card de formulário sempre com superfície própria (--surface), borda
  sutil (--surface-border) e sombra de elevação
  (box-shadow: 0 24px 60px -24px rgba(0,0,0,0.55))

## Microinterações (obrigatório em todo formulário)
- Input: glow sutil ao redor no foco
  (box-shadow: 0 0 0 3px rgba(201,162,39,0.15))
- Botão primário: elevação + sombra mais forte no hover
  (translateY(-1px) + box-shadow mais intenso), volta ao normal no active

## Checklist de autocrítica (rodar antes de entregar qualquer tela)
- O painel de destaque tem mais de 60% de área vazia sem elemento com
  peso visual? Se sim, falhou.
- Algum elemento caiu em padrão genérico do nicho em vez de escolha
  específica desta marca?
- O ícone usado é o arquivo .svg real aprovado, ou foi inventado?
- Está visualmente consistente com as outras telas já construídas?

## Regra
Toda nova tela usa exclusivamente esses tokens. Não introduzir cor,
fonte ou ícone novo sem atualizar este arquivo primeiro.