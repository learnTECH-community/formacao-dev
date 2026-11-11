# Plano de testes do Painel de Formação

**Atualizado em:** 10/11/2026 (T7.6). Revisar a cada trilha nova que mexe no painel.

O painel lê o `CATALOGO.md` e mostra o progresso. O que mais pode dar errado, em ordem: mostrar um número errado, esconder um item, ficar inutilizável para quem usa teclado ou leitor de tela, e quebrar quando a rede falha. Os testes abaixo cobrem esses riscos em quatro níveis.

## Níveis e ferramentas

| Nível | Ferramenta | Onde | Roda em |
|---|---|---|---|
| Unidade | Vitest (ambiente node) | `painel/src/*.test.ts`, `scripts/catalogo.test.mjs` | `npm test`, job `catalogo`; cobertura no job `cobertura` |
| Integração (componente e app) | Vitest + jsdom + Testing Library | `painel/src/**/*.test.tsx`, `useCatalogo.test.ts` | `npm test`, job `catalogo` |
| Ponta a ponta | Playwright + `@axe-core/playwright`: Chromium nos temas claro e escuro (tudo); WebKit e celular emulado (Pixel 7) no fluxo principal | `e2e/*.spec.mjs` | `npm run test:e2e`, job `painel` |
| API (rotas e contrato) | `node:test` + Ajv contra o `api/openapi.json`, com o repositório em memória | `api/test/*.test.mjs` | `npm test` em `api/`, job `api` |
| Carga | autocannon, 50 conexões por rota, meta p95 < 300 ms | `api/carga/carga.mjs` | à mão, `npm run carga` em `api/` (resultado em `docs/carga.md`); uma rodada curta no job `api` |
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
| Rotas da API e contrato com o OpenAPI | `api/test/conclusoes.test.mjs`, `erros.test.mjs` | `api/test/app.test.mjs`, `contrato.test.mjs` (T7.8) | — | — |
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
| 8 | A API muda uma resposta e quebra quem a usa | Médio | `api/test/contrato.test.mjs`: toda rota, sucesso e erro, contra o `openapi.json` (T7.8) |
| 9 | Lista grande fica lenta ao fixar ou trocar o tema | Baixo hoje (161 itens) | `renderizacoes.test.tsx` |

## O que não se testa, e por quê

- **Firefox e aparelho real:** o fluxo principal (`fluxo`, `rotas` e `estados`) roda no Chromium, no WebKit e num celular emulado (T7.9); o resto, só no Chromium. Firefox e aparelho físico ficam de fora por tempo de CI.
- **Desempenho no ar (LCP):** o painel ainda não está publicado (T9). A medição local está na T7.3 (#172).
- **API publicada:** a API roda só local e no CI; publicar é do responsável. O contrato (T7.8) roda contra o app local, sem banco.
- **Conteúdo do roadmap.sh:** só há links (ADR 001). Os links não são abertos nos testes, para o CI não depender de outro site.
- **Leitor de tela real:** não dá para automatizar com fidelidade; fica no teste manual (T2.3, #27).

## Como rodar

Os comandos estão no README, seção "Rodar o painel". O relatório do Playwright de cada PR fica no artefato `playwright-report` do CI.
