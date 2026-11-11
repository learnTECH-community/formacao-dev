# Como contribuir

Português do Brasil, frases curtas e diretas, em código, issues, PRs e revisões.

## Fluxo

```
feature/AAAA-MM-DD  →  developer/sprint-<próxima quinta>  →  main
```

- Crie a `feature` a partir da sprint da semana. Se a sprint não existir, peça na issue.
- Commits pequenos, no padrão `feat:`, `fix:`, `docs:`, `test:`, `ci:`.
- Nunca: force push, reescrever histórico ou push direto na `main`.

## Issue

Toda issue tem:
- **Objetivo**: o que muda, em uma frase.
- **Motivo**: por que agora.
- **Critérios de entrega**: de 3 a 5, verificáveis.
- **Fora desta issue**: o que não entra.

## Novo item do catálogo

Ao estudar um tópico da trilha no roadmap.sh, na ordem do site, proponha um item com o modelo "Novo item":
- O código segue o último da trilha (`T4.6` depois de `T4.5`).
- O texto é uma tarefa prática no painel, com palavras próprias. Não copie o texto do roadmap.sh.
- Cite o nome do tópico e a trilha do roadmap.sh, para a issue de cobertura marcar o tópico como coberto.

## PR

- Título com o código do item: `T4.2: filtro no endereço da página`.
- Descrição: o que mudou, como testar, a evidência (saída do teste, print) e `Closes #N`.
- O item marcado com `[x]` no `CATALOGO.md` e a linha "Progresso" atualizada (`node scripts/catalogo.mjs --atualizar`).
- CI verde antes de pedir revisão.

## O que o CI confere

Todo PR para a `main` ou para uma `developer/**` roda o workflow `.github/workflows/ci.yml` (T9.1):

| Job | O que faz |
|---|---|
| `catalogo` | tipos (`npm run typecheck`), `npm test`, o catálogo e a busca de segredos (`node scripts/segredos.mjs`) |
| `app` | lint (`npm run lint`), build, orçamento de peso e `npm audit --omit=dev` |
| `cobertura` | cobertura dos cálculos, com limite de 90% |
| `painel` | testes no navegador (Playwright e axe) |
| `api` | testes da API com SQLite e MongoDB e `npm audit` |

Segredos nunca entram no Git: só variáveis de ambiente, com os nomes no `api/.env.example` e os valores vazios. O `.env` está no `.gitignore`. O `npm audit` barra vulnerabilidade alta ou crítica nas dependências de produção; baixa e média aparecem no log para tratar numa issue.

Se um job falha, o PR não está pronto. Rode o mesmo comando local antes do push.

## Alertas de segurança (CodeQL)

O workflow `.github/workflows/codeql.yml` analisa o código em todo PR e toda segunda (T10.11). Os alertas ficam na aba **Security → Code scanning**.
- Alerta alto ou crítico: corrija no mesmo PR ou abra uma issue com prazo.
- **Não dispense um alerta sem motivo.** Se for falso positivo, use "Dismiss" com o motivo escrito (por exemplo: "o valor vem de uma lista fixa do código") e registre no `docs/seguranca.md`.
- Na dúvida, pergunte no PR antes de dispensar.

## Dependências (Dependabot)

O `.github/dependabot.yml` abre, toda segunda, PRs de atualização para a `main`: um para o painel, um para a API e um para as Actions (T9.6). Versões menores e correções vêm agrupadas num PR só; versão maior vem sozinha.
- O PR do Dependabot passa pelo mesmo CI. Vermelho não entra.
- Versão maior: leia as notas de migração antes de aprovar.
- Quem mescla é o responsável.

## Revisão

Uma boa revisão tem três partes:
1. **Pergunta**: algo que você não entendeu. Pergunte, não suponha.
2. **Sugestão**: uma mudança concreta, com o porquê. Diga se bloqueia o merge ou não.
3. **Reconhecimento**: o que ficou bom, de forma específica.

Revise o código, não a pessoa. Quem abriu o PR responde a cada comentário: com o ajuste ou com o motivo para não ajustar.

## Contribuição externa

Ao contribuir em outro projeto do GitHub, abra uma issue aqui com o modelo "Contribuição externa". Ela registra o link e o item do catálogo que você praticou. Siga sempre o `CONTRIBUTING.md` do outro projeto.

## Conduta

Respeito, paciência com quem está começando e nenhum dado pessoal de outras pessoas em issues ou PRs.
