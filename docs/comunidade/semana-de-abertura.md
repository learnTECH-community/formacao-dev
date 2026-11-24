# Plano da semana de abertura (quinta 26/11 a quarta 02/12/2026)

A porta abre quando o PR da sprint chega à `main` (#318) e as Discussions são configuradas (#320). Este plano diz o que medir, quem faz o quê e o que é só de quem administra. O que se aprende aqui segue para a meta do MVP de 08/12 (#319).

## Ponto de partida (lido em 23/11)

| Medida | Hoje | Fonte |
|---|---|---|
| Saúde da comunidade no GitHub | 62% | `gh api repos/learnTECH-community/formacao-dev/community/profile` |
| Visitas nos últimos 14 dias | 30 visitas, 3 pessoas | Insights → Traffic |
| PRs de quem é de fora | 0 | triagem diária |
| `good first issue` abertas | 21 | rótulo `good first issue` |
| Contribuições de fora sem resposta há mais de 48 h | 0 | triagem diária |

## Metas da semana

| Medida | Meta até 02/12 | Como se mede |
|---|---|---|
| 1ª resposta a quem é de fora | sempre em menos de 48 h (zero 🔴) | `node scripts/triagem.mjs`, todo dia |
| Saúde da comunidade | 100% | a mesma chamada da tabela acima, na quinta, depois do #318 |
| Visitas | 3 vezes o ponto de partida (90 visitas ou 9 pessoas em 14 dias) | Insights → Traffic, na quarta |
| Apresentações em Boas-vindas | 3 | página da categoria |
| 1º PR externo | 1 aberto (mesclado é bônus) | triagem diária, seção "Contribuições de fora" |
| `good first issue` livres | 10 ou mais, todo dia | issues com o rótulo e sem ninguém atribuído |

Se a meta de visitas não vier, o problema é de divulgação, e não do repositório. Se vierem visitas e nenhum "vou fazer", o problema está nas issues: rever a #321.

## Dia a dia

| Dia | Quem administra (o responsável) | Sessão comunidade LearnTech (especialista) | Líder |
|---|---|---|---|
| **qui 26/11** | Antes, dar a ORDEM para o #328 (o passo a passo com as telas) entrar na sprint. Depois, mesclar o #318 na `main`. Seguir os 9 passos de [discussions.md](discussions.md): editar as categorias, publicar e fixar o post, ligar Reported content | Conferir a saúde da comunidade (meta: 100%), rodar a triagem, conferir os endereços das categorias e ajustar os formulários se for preciso | Registrar no Diário |
| **sex 27/11** | Divulgar a abertura nos canais dele (é publicação em nome dele) | Triagem. Responder em até 48 h com as respostas prontas de [triagem.md](triagem.md). Anotar a 1ª semana na #324 | Consolidar a semana |
| **sáb 28/11** | — | Triagem | — |
| **seg 30/11** | — | Triagem. Repor o estoque: se houver menos de 10 `good first issue` livres, preparar novas | Planejar a semana |
| **ter 01/12** | Mesclar o #314 (prazo do Trivy em 03/12) | Triagem. Depois do #314, PR que tira as exceções do `.trivyignore` e fecha o #312 | — |
| **qua 02/12** | — | Triagem. Ler o Traffic e fechar a tabela de metas | Levar o resultado ao relatório |

**Só quem administra faz:** merge na `main`, configuração (Discussions, Settings), publicação em nome dele e divulgação fora do GitHub. A sessão especialista prepara o texto e o passo a passo de cada um.

## 3 melhorias de processo e automação

| # | Melhoria | O que resolve | Custo | Depende de quem administra |
|---|---|---|---|---|
| 1 | **Triagem no GitHub Actions** (`workflow` agendado todo dia às 8h, que roda `scripts/triagem.mjs` e mostra o relatório no resumo do job) | Tira a triagem do computador de uma pessoa. O relatório fica no próprio repositório, para qualquer pessoa da manutenção | 1 a 2 h de trabalho. Cerca de 1 min de Actions por dia, que é gratuito em repositório público. Não precisa de segredo novo: só o `GITHUB_TOKEN` de leitura | Merge na `main` |
| 2 | **Rótulo de trilha automático nos PRs** ([`actions/labeler`](https://github.com/actions/labeler), v7.0.0, fixada por SHA) pelos caminhos dos arquivos: `painel/` → T2/T4, `api/` → T5, `scripts/` → T1, `docs/comunidade/` → T11 | Quem chega não precisa saber os rótulos. A triagem e o painel de cada trilha ficam certos sem trabalho manual | 1 h de trabalho, mais 1 arquivo `.github/labeler.yml`. Alguns segundos de Actions por PR | Merge na `main` |
| 3 | **Boas-vindas no primeiro PR e na primeira issue** ([`actions/first-interaction`](https://github.com/actions/first-interaction), v3.1.0, fixada por SHA): uma mensagem com o link do "Comece em 15 minutos" e o compromisso das 48 h | A pessoa recebe resposta no primeiro minuto. As 48 h continuam valendo para a resposta de uma pessoa | 30 min de trabalho. Alguns segundos de Actions por item. Risco: a mensagem soar automática. Por isso o texto deixa claro que uma pessoa responde em até 48 h | Merge na `main` e a aprovação do texto (é a primeira coisa que alguém de fora lê) |

Ordem sugerida: 3, depois 1, depois 2. A 3 dá o maior efeito para quem chega, com o menor custo. Cada uma vira uma issue e um PR para a sprint, sem configuração no Settings.

## Depois da semana
- Uma escada para quem já contribuiu: depois do 1º PR mesclado, sugerir uma issue `help wanted` à pessoa ([benchmark](benchmark.md), prática 3).
- Uma seção "Quem já contribuiu" no README, atualizada a cada merge de alguém de fora.
- Se a regra das 48 h vencer duas semanas seguidas, rever o prazo em Ideias, como manda o [roteiro](triagem.md).
