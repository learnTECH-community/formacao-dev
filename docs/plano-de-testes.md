# Plano de testes do Painel de Formação

**Atualizado em:** 10/11/2026 (T7.6). Revisar a cada trilha nova que mexe no painel.

O painel lê o `CATALOGO.md` e mostra o progresso. O que mais pode dar errado, em ordem: mostrar um número errado, esconder um item, ficar inutilizável para quem usa teclado ou leitor de tela, e quebrar quando a rede falha. Os testes abaixo cobrem esses riscos em quatro níveis.

## Níveis e ferramentas

| Nível | Ferramenta | Onde | Roda em |
|---|---|---|---|
| Unidade | Vitest (ambiente node) | `painel/src/*.test.ts`, `scripts/catalogo.test.mjs` | `npm test`, job `catalogo`; cobertura no job `cobertura` |
| Integração (componente e app) | Vitest + jsdom + Testing Library | `painel/src/**/*.test.tsx`, `useCatalogo.test.ts` | `npm test`, job `catalogo` |
| Ponta a ponta | Playwright + `@axe-core/playwright`, Chromium, temas claro e escuro | `e2e/*.spec.mjs` | `npm run test:e2e`, job `painel` |
| Manual | Pessoa com teclado e leitor de tela | roteiro nas issues (T2.3, T7.7) | antes de marcar itens que pedem pessoa real |

## Fluxos por nível

| Fluxo | Unidade | Integração | Ponta a ponta | Manual |
|---|---|---|---|---|
| Ler o catálogo (trilhas, itens, links) | `catalogo.test.ts`, `scripts/catalogo.test.mjs` | `App.test.tsx` | `catalogo.spec.mjs` | — |
| Calcular o progresso | `progresso.test.ts` (cobertura ≥ 90%) | `componentes.test.tsx` (barra) | `catalogo.spec.mjs`, `progresso.spec.mjs` | Leitor de tela lê a barra (T2.3, #27) |
| Filtrar por trilha e situação | `filtro.test.ts` | `componentes.test.tsx`, `App.test.tsx` | `filtros.spec.mjs` | — |
| Filtro no endereço, Voltar e Avançar | `filtroNoEndereco.test.ts` | — | `rotas.spec.mjs` | — |
| Detalhe da trilha e página não encontrada | — | `App.test.tsx` (rotas) | `rotas.spec.mjs`, `fluxo.spec.mjs` | — |
| Fixar itens e tema | `estado/preferencias.test.ts` | `componentes.test.tsx` | `fixados.spec.mjs`, `tema.spec.mjs` | — |
| Carregando, erro, vazio e nova tentativa | — | `useCatalogo.test.ts`, `App.test.tsx` | `estados.spec.mjs` | — |
| Teclado, foco e acessibilidade | — | — | `acessibilidade.spec.mjs`, `axe-telas.spec.mjs` | Percurso com NVDA ou VoiceOver |
| Renderizações numa lista grande | — | `renderizacoes.test.tsx` (1.000 itens) | — | — |
| Página sem rolagem lateral e texto legível | — | — | `estrutura.spec.mjs` (320, 768 e 1440 px) | — |

## Riscos priorizados

| # | Risco | Impacto | Teste que cobre |
|---|---|---|---|
| 1 | Progresso errado (conta itens a mais ou a menos, arredonda para 100% antes da hora) | Alto: é o número que a comunidade acompanha | `progresso.test.ts`, `catalogo.spec.mjs` (compara com o `CATALOGO.md` real), cobertura ≥ 90% |
| 2 | Item do catálogo some na tela (linha fora do formato) | Alto | `scripts/catalogo.mjs` no CI recusa linha fora do formato; `catalogo.spec.mjs` conta todos os itens |
| 3 | Texto do catálogo vira HTML e roda script | Alto | `catalogo.spec.mjs` ("HTML dentro do catálogo aparece como texto"), `componentes.test.tsx`, regra `react/no-danger` no lint |
| 4 | Quem usa teclado ou leitor de tela não consegue usar | Alto | `acessibilidade.spec.mjs` (Tab, foco visível, nada prende o foco), `axe-telas.spec.mjs` em 7 telas e 2 temas |
| 5 | Falha de rede deixa a tela vazia, sem saída | Médio | `estados.spec.mjs`, `App.test.tsx`, `useCatalogo.test.ts` |
| 6 | Link compartilhado com filtro abre outra coisa | Médio | `rotas.spec.mjs`, `filtroNoEndereco.test.ts` |
| 7 | Tema escuro com contraste ruim | Médio | `tema.spec.mjs` e axe no projeto `escuro` |
| 8 | Lista grande fica lenta ao fixar ou trocar o tema | Baixo hoje (161 itens) | `renderizacoes.test.tsx` |

## O que não se testa, e por quê

- **Outros navegadores e celular emulado:** os testes rodam só no Chromium. WebKit e um aparelho móvel entram na T7.9 (#110).
- **Desempenho no ar (LCP):** o painel ainda não está publicado (T9). A medição local está na T7.3 (#172).
- **API e banco:** ainda não existem (T5 e T6); contrato e carga ficam na T7.8 (#109) e na T7.10 (#111).
- **Conteúdo do roadmap.sh:** só há links (ADR 001). Os links não são abertos nos testes, para o CI não depender de outro site.
- **Leitor de tela real:** não dá para automatizar com fidelidade; fica no teste manual (T2.3, #27).

## Como rodar

Os comandos estão no README, seção "Rodar o painel". O relatório do Playwright de cada PR fica no artefato `playwright-report` do CI.
