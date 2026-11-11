# MVP · formacao-dev

**Nível:** N1 (estudo). É um projeto de formação: os critérios 5 (medição de uso) e 7 (desempenho no ar) são "Não se aplica (N1)" e saem da conta. O responsável pode mudar para N2 quando o painel estiver publicado (T9.3).

**Resumo:** 8 de 10 aplicáveis atendidos

**Finalizado:** não

| # | Critério | Situação | Evidência |
|---|---|---|---|
| 1 | Problema e público claros | Atende | Ver "Problema e público", abaixo |
| 2 | Hipótese a validar | Atende | Ver "Hipótese", abaixo |
| 3 | Fluxo principal completo | Atende | 10/11/2026, `npm run test:e2e -- e2e/fluxo.spec.mjs` → passa no Chromium (claro e escuro), no WebKit e num celular emulado (Pixel 7): abrir o painel, filtrar por trilha e situação, abrir o detalhe da trilha pelo link do cartão e voltar com o filtro mantido, só por papéis e nomes (T7.1, T7.9). CI do PR #193 (run 42871151673): 154 passed, 28 deles no WebKit e no celular. Rotas e filtro no endereço em `e2e/rotas.spec.mjs` (T4.2, T4.3) |
| 4 | Escopo enxuto | Atende | Ver "Fora do MVP", abaixo |
| 5 | Medição de uso | Não se aplica (N1) | — |
| 6 | Falhas tratadas | Atende | 10/11/2026: no navegador, `e2e/estados.spec.mjs` (espera com `aria-busy`, falha de rede com "Tentar de novo", HTTP 500 e catálogo vazio) passa em todos os projetos; na unidade, `useCatalogo.test.ts` contra servidor simulado (msw): HTTP 500, falha de rede com até duas novas tentativas, vazio, demora, cancelamento e nova tentativa; `App.test.tsx` e `LimiteDeErro.test.tsx` (erro num cartão não derruba a página) (T3.5, T4.7, T4.11, T4.13, T7.4). Na API (10/11/2026, `cd api && npm test`): erros em Problem Details com 400, 404, 413, 429, 500, 502 e 503 (`erros.test.mjs`, T5.9), falha de rede, demora e limite do GitHub sem derrubar a API (`github.test.mjs`, T5.5), e o painel com a API mostra o alerta se o ranking falhar (`Ranking.test.tsx`) |
| 7 | Desempenho aceitável | Não se aplica (N1) | — |
| 8 | Acessibilidade básica | Atende | 10/11/2026, `npm run test:e2e` → axe (WCAG 2.1 A e AA) sem violações nos temas claro e escuro, em 1440 e 320 px, com o catálogo real; `e2e/axe-telas.spec.mjs` em 7 telas (início, com filtro, detalhe, trilha e página não encontradas, erro, vazio) (T7.2), mais a janela modal aberta (`e2e/modal.spec.mjs`, foco preso e Esc, T4.15), o formulário com erros (`e2e/proposta.spec.mjs`, T4.12) e a espera do detalhe sob demanda (T4.14). Teclado: "Pular para o conteúdo", foco visível em toda parada do Tab, ordem do Tab, nada prende o foco, filtros pelo teclado (T2.4, T2.6, T3.3). Falta o teste com leitor de tela real (T2.3, #27) |
| 9 | Segurança e conformidade | Parcial | 10/11/2026: `npm audit --omit=dev --audit-level=high` no painel (job `app`) e na API (job `api`) → `found 0 vulnerabilities`; `gh api repos/learnTECH-community/formacao-dev/dependabot/alerts` → `0`; Dependabot semanal (`.github/dependabot.yml`, T9.6). `node scripts/segredos.mjs` no job `catalogo` → nenhum segredo nos arquivos versionados (T10.1). CodeQL em todo PR e toda semana: primeira análise com 0 alertas; os alertas que apareceram nos workflows novos (Actions sem commit fixo, checkout do `workflow_run`) foram corrigidos no mesmo ciclo (T10.11). Trivy nas imagens da API e do Nginx sem alta nem crítica corrigível (T9.13) e OWASP ZAP no compose do CI sem alerta alto (T10.12), no workflow `Varreduras`. API: `helmet` com HSTS, CORS só para `ORIGENS_PERMITIDAS`, checagem de origem contra CSRF, cookie `HttpOnly`, `Secure`, `SameSite=Lax` e assinado com HMAC, tempos limite, erro 500 sem detalhe, SQL parametrizado e testes de XSS e injeção (T10.3, T10.7 a T10.10, T10.14). `SECURITY.md` (T10.4), roteiro de incidente com ensaio (T10.13), modelagem de ameaças (T10.6, `docs/ameacas.md`). Dados pessoais decididos em `docs/dados-pessoais.md`, aprovado em 11/11/2026 (#248), com referências à Lei 13.709/2018. Falta: ligar o aviso privado de falhas (#246) |
| 10 | Entrega confiável | Parcial | CI em todo PR para `developer/**` e `main` (T9.1), com os jobs `catalogo`, `app`, `cobertura`, `painel`, `api`, `docker` (imagem em estágios, compose, Nginx, rede interna, volume e Prometheus) e `compose-dev`, mais o CodeQL e, quando os arquivos mudam, `Varreduras` (`trivy`, `zap`) e `Imagem da API`. Workflows de publicação prontos e travados até a configuração do responsável: Pages depois do CI verde (T9.3, variável `PAGES_ATIVO`), imagem no GHCR na release (T9.10), checagem agendada de disponibilidade (T9.8) e o `render.yaml` da API (T9.5), passo a passo em `docs/publicar.md` (#230). A `main` está sem proteção por decisão do responsável em 10/11/2026 (`gh api repos/learnTECH-community/formacao-dev/rulesets` → `[]`); passo a passo do ruleset na issue #38 (T9.2), `depende-do-responsavel` |
| 11 | Testes dos fluxos críticos | Atende | 10/11/2026, local: `npm test` → 15 testes de scripts (catálogo, servidor, LCP, orçamento) + 157 do Vitest (funções, componentes, hooks, app, rotas, renderizações, painel com a API), e `npm run test:e2e` → 160 passed, sem nenhum `skipped`. CI do PR #204 (run 42878665529): scripts `# pass 15` e `# skipped 0`, Vitest `136 passed`, Playwright `166 passed`. Cobertura dos cálculos: 100% das linhas e 97,7% dos ramos (`npm run cobertura`). API, 10/11/2026: CI do PR #236 (job `api`, Node 22 com o `mongo:7`) → `tests 230`, `pass 227`, `fail 0`; os 3 pulados são os da trava de acesso, que rodam no passo com o Node 24 (`pass 5`, `skipped 0`); um passo falha se algum teste do MongoDB for pulado. Cobrem rotas, contrato com o OpenAPI (T7.8), SQLite, MongoDB e uma carga curta (T7.10). Lote T9 e T10 (10/11/2026, local): `npm test` → scripts `pass 36`, `fail 0` (segredos, ZAP, disponibilidade, `render.yaml`), Vitest `157 passed`; `cd api && npm test` → `tests 245`, `pass 242`, `fail 0` (2 pulados: MongoDB sem `MONGO_URL` local, que rodam no CI), com os testes novos de cabeçalhos, CORS, tempos limite, erro em produção, injeção, sessão, HMAC, HTTPS e métricas; no navegador, `e2e/xss.spec.mjs` |
| 12 | Documentação honesta | Atende | 10/11/2026, nos clones novos deste ciclo: os comandos de "Rodar o painel" do README (`npm ci`, `npm run typecheck`, `npm run lint`, `npm test`, `npm run cobertura`, `npm run build`, `npm run orcamento`, `npx playwright install chromium webkit`, `npm run test:e2e`, `npm run servir`, `npm run lcp`, `npm run painel`) rodaram sem erro. Os de "Rodar a API" também (`cd api`, `npm ci`, `npm test`, `npm run semear`, `npm start`, `curl /v1/catalogo`, `npm run carga`), e o painel com `VITE_API_URL` foi aberto num navegador contra a API local. Plano de testes em `docs/plano-de-testes.md` (T7.6); API em `docs/api.md` (T5.3). "Rodar com Docker" e "Desenvolver dentro do compose": esta máquina não tem Docker; os comandos foram conferidos no CI, nos jobs `docker` e `compose-dev` (runners do GitHub), em 10/11/2026 |

## Problema e público

Pessoas da comunidade learnTECH que querem uma formação fullstack prática não sabem o que falta em cada trilha nem por onde continuar. O Painel de Formação mostra, numa página, o progresso de cada trilha do catálogo e os itens a fazer, lidos do próprio `CATALOGO.md`.

## Hipótese

Acreditamos que itens pequenos e práticos, num projeto comum e com o progresso visível no painel, farão a comunidade concluir trilhas; saberemos quando 3 pessoas concluírem a trilha T2 em 4 semanas, contadas a partir de 10/11/2026.

## Fora do MVP

- Login e perfil de pessoa: o painel mostra o catálogo, não contas.
- Ranking ou pontuação entre pessoas no painel publicado. A tabela "Quem mais concluiu" existe como estudo de SQL (T6.9) e só aparece com a API configurada.
- Certificados.
- Espelhar os nós do roadmap.sh: a licença não permite (ADR 001).
- Publicar a API e o banco: o código existe (trilhas T5 e T6, em `api/`) e roda local e no CI; publicar e ligar o login do GitHub é do responsável (#230). O painel publicado segue lendo o `CATALOGO.md`.
- Medição de uso: o projeto é N1.

## Histórico

### Ciclo de 10/11/2026 (entrega e segurança, T9 e T10)

**Resumo:** 8 de 10 aplicáveis atendidos, sem mudar a conta. A trilha T9 trouxe o Docker (imagem em estágios, compose com Nginx, banco em rede interna, volume e métricas), os workflows de publicação e a checagem de disponibilidade; a T10 trouxe a busca de segredos, o CodeQL, o Trivy, o ZAP, a sessão contra CSRF com cookie assinado, o HTTPS com HSTS e os documentos de segurança. O 9 segue Parcial pela decisão de dados pessoais (#248); o 10, pela `main` sem proteção (#38).

### Ciclo de 10/11/2026 (API e banco, T5 e T6)

**Resumo:** 8 de 10 aplicáveis atendidos. A API (Express 5, SQLite e MongoDB) reforçou as evidências dos critérios 6, 9, 10, 11 e 12, sem mudar a conta: 9 segue sem `SECURITY.md` e sem a decisão de dados pessoais, e 10 segue com a `main` sem proteção.

### Ciclo de 10/11/2026 (painel em JS e TS, antes do React)

**Resumo:** 8 de 10 aplicáveis atendidos. Parcial: 9 e 10. O React (T4) e a trilha de qualidade (T7) não mudaram a conta: reforçaram as evidências dos critérios 3, 6, 8, 10, 11 e 12.

### Ciclo de 10/11/2026 (antes do painel)

**Resumo:** 3 de 10 aplicáveis atendidos. Atende: 1, 2 e 4. Parcial: 9, 10 e 12. Não atende: 3, 6, 8 e 11.
