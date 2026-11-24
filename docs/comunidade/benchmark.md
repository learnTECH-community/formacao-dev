# Benchmark: como 5 comunidades recebem quem chega

Pesquisa de 23/11/2026, feita só com fontes públicas. Os números de issues abertas foram lidos nesse dia pela API do GitHub e mudam todo dia. A pergunta: como cada comunidade atrai e segura a primeira contribuição, e o que a formacao-dev pode copiar já na semana de abertura.

## As 5 comunidades

| Comunidade | Onde | Entrada para iniciantes | Onboarding | Ritmo de resposta |
|---|---|---|---|---|
| **Querido Diário** (Open Knowledge Brasil) | 🇧🇷 | Rótulo `good first issue` em vários repositórios. No principal, 25 abertas em 23/11. Para pegar uma tarefa, a pessoa comenta na issue. | Um [guia de contribuição](https://docs.queridodiario.ok.org.br/en/latest/contributing/contribution-guide.html) único para todos os repositórios, mais um repositório só da [comunidade](https://github.com/okfn-brasil/querido-diario-comunidade) com as Discussions ligadas. | As dúvidas vão para o Discord. Não há um prazo de resposta escrito. |
| **TabNews** | 🇧🇷 | `good first issue` descrita como tarefa "possível até para quem nunca fez uma contribuição" ([CONTRIBUTING](https://github.com/filipedeschamps/tabnews.com.br/blob/main/CONTRIBUTING.md)). Em 23/11 havia 0 abertas. | O CONTRIBUTING, em português, convida a **revisar PRs mesmo sem ser mantenedor** e pede que se discuta o problema na issue antes de escrever código. | Não há prazo escrito. Quem contribui de forma constante é reconhecido publicamente como [core contributor](https://www.tabnews.com.br/filipedeschamps/tabnews-acabou-de-ficar-mais-forte-rafaeltcb-se-tornou-core-contributor). |
| **Kubernetes** | 🌎 | `good first issue` é um subconjunto de `help wanted`: o rótulo é a **promessa de que um membro vai acompanhar o PR** ([guia](https://www.kubernetes.dev/docs/guide/help-wanted)). A tarefa não pode exigir montagem de ambiente avançada nem conhecimento do domínio. Em 23/11 havia 7 abertas no repositório principal. | Um [guia da primeira contribuição](https://kubernetes.dev/docs/guide/first-contribution). Depois de 1 ou 2 `good first issue`, a pessoa passa para `help wanted`. | Há uma [triagem de issues](https://kubernetes.dev/docs/guide/issue-triage) com papéis definidos. Os rótulos são aplicados por comandos (`/good-first-issue`). |
| **freeCodeCamp** | 🌎 | Rótulo `first timers only`, com a mudança e o lugar dela descritos na issue. Em 23/11 havia 1 aberta. Há também `help wanted`, para quem conhece mais o código. | Um site só de [contribuição](https://contribute.freecodecamp.org/getting-started/) com vários caminhos: código, tradução, artigos e vídeos. | As dúvidas vão para o Discord ([FAQ](https://contribute.freecodecamp.org/faq/)). |
| **First Contributions** | 🌎 | O repositório inteiro é a primeira tarefa: fork, branch e um PR que acrescenta o nome da pessoa numa lista. | Um tutorial passo a passo no README, com imagens, e mais de 100 traduções em `docs/translations`. O [repositório](https://github.com/firstcontributions/first-contributions) tem 100% de saúde de comunidade no GitHub. | O volume é alto, e a tarefa é desenhada para não precisar de revisão difícil. |

**Referência de medida:** a CHAOSS, um projeto da Linux Foundation que define métricas de comunidade, mede o [tempo até a primeira resposta](https://chaoss.community/kb/metric-time-to-first-response/) e lembra que responder rápido melhora a entrada e a permanência de quem chega. Um [estudo com projetos do npm](https://arxiv.org/pdf/2104.02933) aponta a demora na resposta como a dificuldade mais citada por quem contribui pela primeira vez.

## O que se repete nas 5

1. **A boa primeira issue diz onde mexer.** Kubernetes e freeCodeCamp pedem a solução esboçada e os arquivos citados. É o formato que a formacao-dev já usa desde o ciclo 2.
2. **O rótulo é uma promessa.** No Kubernetes, marcar `good first issue` compromete alguém a acompanhar o PR até o fim.
3. **Há uma escada.** Primeiro `good first issue`, depois `help wanted`, depois o reconhecimento (TabNews, Kubernetes).
4. **As issues fáceis acabam rápido.** TabNews, freeCodeCamp e Kubernetes tinham de 0 a 7 abertas. O estoque precisa ser reposto toda semana.
5. **Contribuir não é só código.** Revisar PR (TabNews), traduzir e escrever (freeCodeCamp) também contam.

## O que aplicar na formacao-dev

| # | Prática | Já temos? | O que fazer |
|---|---|---|---|
| 1 | Issue de entrada com "onde mexer", aceite e tempo | sim, nas 21 abertas | manter o padrão nas issues novas (as 6 de 23/11 já seguem) |
| 2 | O rótulo como promessa de acompanhamento | em parte (a regra das 48 h) | escrever no CONTRIBUTING: "quem rotula acompanha o PR até o merge" |
| 3 | Escada `good first issue` → `help wanted` → reconhecimento | não | depois do 1º PR mesclado, sugerir uma `help wanted` à pessoa; listar quem contribuiu no README (seção "Depois da semana" de [semana-de-abertura.md](semana-de-abertura.md)) |
| 4 | Estoque reposto toda semana | não | meta: 10 ou mais `good first issue` livres às segundas, conferida pela triagem |
| 5 | Contribuição sem código | em parte (T8.1, T11.7) | 2 das issues novas são de documentação (#331, #334) |
| 6 | Medir o tempo até a primeira resposta | sim (#324, triagem diária) | registrar toda semana na #324 |

**O que não copiar agora:** um Discord ou chat próprio. Com uma pessoa só mantendo o projeto, um canal a mais divide a atenção. As Discussions fazem esse papel.
