# MVP · formacao-dev

**Nível:** N1 (estudo). É um projeto de formação: os critérios 5 (medição de uso) e 7 (desempenho no ar) são "Não se aplica (N1)" e saem da conta. O responsável pode mudar para N2 quando o painel estiver publicado (T9.3).

**Resumo:** 8 de 10 aplicáveis atendidos

**Finalizado:** não

| # | Critério | Situação | Evidência |
|---|---|---|---|
| 1 | Problema e público claros | Atende | Ver "Problema e público", abaixo |
| 2 | Hipótese a validar | Atende | Ver "Hipótese", abaixo |
| 3 | Fluxo principal completo | Atende | 10/11/2026, CI do PR #153 (run 42845843272, job `painel`, Playwright no Chromium): abrir o painel, ver as 12 trilhas com o progresso lido do `CATALOGO.md`, filtrar por trilha e situação (`e2e/catalogo.spec.mjs`, `e2e/filtros.spec.mjs`) → pass. A página de detalhe da trilha é a T4.3 |
| 4 | Escopo enxuto | Atende | Ver "Fora do MVP", abaixo |
| 5 | Medição de uso | Não se aplica (N1) | — |
| 6 | Falhas tratadas | Atende | 10/11/2026, `npm run test:e2e -- e2e/estados.spec.mjs` → 10 passed (claro e escuro): espera com `aria-busy`, falha de rede com "Tentar de novo", HTTP 500 e catálogo vazio (T3.5, PR #148) |
| 7 | Desempenho aceitável | Não se aplica (N1) | — |
| 8 | Acessibilidade básica | Atende | 10/11/2026, `npm run test:e2e` → axe (WCAG 2.1 A e AA) sem violações nos temas claro e escuro, em 1440 e 320 px, com o catálogo real; teste de teclado: "Pular para o conteúdo", foco visível em toda parada do Tab, ordem do Tab, nada prende o foco, filtros pelo teclado (T2.4, T2.5, T2.6, T3.3). Falta o teste com leitor de tela real (T2.3, #27) |
| 9 | Segurança e conformidade | Parcial | 10/11/2026: `npm audit --omit=dev` → `found 0 vulnerabilities` (o projeto não tem dependência de produção); `gh api repos/learnTECH-community/formacao-dev/dependabot/alerts` → `[]`; sem segredo no código; o painel não guarda dado pessoal. Falta o `SECURITY.md` (T10.4) e a decisão por escrito sobre dados pessoais (T10.5) |
| 10 | Entrega confiável | Parcial | CI com os jobs `catalogo` (typecheck, `npm test`, catálogo) e `painel` (Playwright) em todo PR para `developer/**` e `main`. A `main` está sem proteção por decisão do responsável em 10/11/2026 (`gh api repos/learnTECH-community/formacao-dev/rulesets` → `[]`); issue #38, `depende-do-responsavel` |
| 11 | Testes dos fluxos críticos | Atende | 10/11/2026, CI do PR #153 (run 42845843272): `npm test` (3 testes do catálogo + 30 do Vitest) e `npm run test:e2e` (62 testes) sem nenhum `skipped`. Com os ajustes da revisão, 66 testes no navegador (local, 10/11/2026) |
| 12 | Documentação honesta | Atende | 10/11/2026, clone novo da sprint: os comandos de "Rodar o painel" do README (`npm ci`, `npm run typecheck`, `npm test`, `npm run build`, `npx playwright install chromium`, `npm run test:e2e`, `npm run painel`) rodaram sem erro (T0.2) |

## Problema e público

Pessoas da comunidade learnTECH que querem uma formação fullstack prática não sabem o que falta em cada trilha nem por onde continuar. O Painel de Formação mostra, numa página, o progresso de cada trilha do catálogo e os itens a fazer, lidos do próprio `CATALOGO.md`.

## Hipótese

Acreditamos que itens pequenos e práticos, num projeto comum e com o progresso visível no painel, farão a comunidade concluir trilhas; saberemos quando 3 pessoas concluírem a trilha T2 em 4 semanas, contadas a partir de 10/11/2026.

## Fora do MVP

- Login e perfil de pessoa: o painel mostra o catálogo, não contas.
- Ranking ou pontuação entre pessoas.
- Certificados.
- Espelhar os nós do roadmap.sh: a licença não permite (ADR 001).
- API e banco próprios: entram nas trilhas T5 e T6, depois do MVP.
- Medição de uso: o projeto é N1.

## Histórico

### Ciclo de 10/11/2026 (antes do painel)

**Resumo:** 3 de 10 aplicáveis atendidos. Atende: 1, 2 e 4. Parcial: 9, 10 e 12. Não atende: 3, 6, 8 e 11.
