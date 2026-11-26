# Mentoria em 3 degraus

O que vem depois da primeira contribuição. Quem fez o 1º PR precisa de um próximo passo claro, senão não volta. Esta escada diz qual é o passo seguinte e o que quem mantém o projeto faz em cada degrau.

Ninguém é obrigado a subir. Cada pessoa sobe no próprio ritmo, e pode ficar num degrau o tempo que quiser.

| Degrau | O que a pessoa faz | Sinal para subir |
|---|---|---|
| 1. Primeira contribuição | 1 issue com o rótulo `good first issue` | o 1º PR mesclado |
| 2. Em par | 1 issue `help wanted`, com a revisão comentada linha a linha (T8.1 e T8.2) | 2 PRs mesclados e 1 revisão feita no PR de outra pessoa |
| 3. Autonomia | uma tarefa maior, e acolher uma pessoa nova (T11.4) | 3 PRs aceitos. A pessoa pode então receber a permissão de triagem, que o responsável configura |

## Degrau 1 · Primeira contribuição

A pessoa escolhe uma issue da lista [Comece aqui (#311)](https://github.com/learnTECH-community/formacao-dev/issues/311). Ela segue o [Comece em 15 minutos](../../CONTRIBUTING.md#comece-em-15-minutos) e abre o PR.

**Quem mantém:**
- responde em até 48 h;
- revisa com pergunta, sugestão e reconhecimento ([Revisão](../../CONTRIBUTING.md#revisão));
- acompanha o PR até o merge.

Depois do merge:
- acrescenta a pessoa em [quem contribuiu](quem-contribuiu.md);
- convida para o degrau 2 com uma issue `help wanted` concreta. "Se quiser continuar, a #N é um bom próximo passo" é melhor do que um convite genérico.

## Degrau 2 · Em par

A pessoa pega uma issue `help wanted`, um pouco maior e com menos roteiro do que a de entrada. Quem mantém revisa linha a linha e explica o porquê de cada sugestão. Nesse degrau, a pessoa também revisa o PR de outra pessoa (T8.1) e responde à revisão que recebe (T8.2).

**Quem mantém:** no fim do PR, conversa com a pessoa a partir de 3 perguntas, sem nota:
1. Você entendeu o código que mudou?
2. Você entendeu o contexto, ou seja, por que a mudança era necessária e o que ela afeta?
3. Você quer continuar?

As respostas mostram o que explicar no próximo PR. Elas não são prova nem servem de classificação. A ideia de avaliar entendimento, e não volume, vem do artigo "Rethinking open source mentorship in the AI era", do GitHub Blog (19/03/2026), citado na #345.

## Degrau 3 · Autonomia

A pessoa pega uma tarefa maior, que pode atravessar mais de um arquivo ou de uma trilha. Ela também acolhe alguém novo (T11.4): responde a primeira issue de uma pessoa que chegou ou revisa o 1º PR dela.

**Quem mantém:**
- passa o contexto da tarefa e deixa a pessoa decidir o caminho;
- revisa o resultado, e não cada passo.

Com 3 PRs aceitos, o responsável pode dar a permissão de triagem (rotular e fechar issues). Essa permissão é configuração do repositório e fica só com ele.

## O que esta escada não é

- **Não é ranking.** Não há placar nem contagem de PRs como prêmio. A gamificação por volume premia a quantidade, e não o aprendizado, e atrai PR para subir número (o README já pede "nada de PR para subir número"). O número de PRs é só o sinal de que a pessoa já conhece o fluxo.
- **Não é prova.** As 3 perguntas do degrau 2 servem para conversar, não para aprovar ou reprovar.
- **Não é obrigatória.** Uma única contribuição já vale, e entra em [quem contribuiu](quem-contribuiu.md).

## Para quem mantém: o estoque de cada degrau

- O degrau 1 precisa de 10 ou mais issues de entrada livres (CONTRIBUTING, "Issues de entrada").
- O degrau 2 precisa de issues `help wanted` livres. Em 26/11/2026 eram 3. Quando a primeira pessoa chegar ao degrau 2, prepare mais.
