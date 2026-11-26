# Roadmap · formacao-dev

As etapas do projeto, do MVP de hoje ao que vem depois. Cada etapa só aponta para as issues e os documentos: o detalhe fica neles, e não aqui.

- O estado de cada critério está em [docs/MVP.md](docs/MVP.md).
- Os 161 itens de estudo estão no [CATALOGO.md](CATALOGO.md).
- O nível do MVP (N1 ou N2) é decisão do responsável.

Atualizado em 26/11/2026. Hoje: MVP N1 com 8 de 10 critérios atendidos e 88 de 161 itens do catálogo feitos.

## Agora · MVP N1 (estudo)

O que falta para os critérios 8, 9, 10 e 2 do [docs/MVP.md](docs/MVP.md), "O que falta e de quem":

| Critério | O que falta | Issue |
|---|---|---|
| 8 · Acessibilidade | testar a barra de progresso com um leitor de tela real (aberta para a comunidade) | [#27](https://github.com/learnTECH-community/formacao-dev/issues/27) |
| 9 · Segurança | ligar o aviso privado de falhas e a varredura de segredos do GitHub | [#246](https://github.com/learnTECH-community/formacao-dev/issues/246) |
| 9 · Segurança | conferir a decisão de dados pessoais | [#271](https://github.com/learnTECH-community/formacao-dev/issues/271) |
| 9 · Segurança | trocar as exceções do Trivy pela imagem nova do nginx (até 03/12) | [#312](https://github.com/learnTECH-community/formacao-dev/issues/312) |
| 9 · Segurança | fixar as actions por SHA e as imagens por digest | [#341](https://github.com/learnTECH-community/formacao-dev/issues/341), [#369](https://github.com/learnTECH-community/formacao-dev/issues/369) |
| 10 · Entrega | proteger a `main` | [#38](https://github.com/learnTECH-community/formacao-dev/issues/38) |
| 11 · Testes | rodar a API inteira no Node 26 ou registrar a causa da trava | [#241](https://github.com/learnTECH-community/formacao-dev/issues/241) |
| 2 · Hipótese | medir se 3 pessoas concluem a trilha T2 até 08/12/2026 | [#319](https://github.com/learnTECH-community/formacao-dev/issues/319) |

A porta de entrada da comunidade também é desta etapa: [Comece aqui (#311)](https://github.com/learnTECH-community/formacao-dev/issues/311), as issues de entrada e a [mentoria em 3 degraus](docs/comunidade/mentoria.md).

## Próximo · MVP N2 (no ar)

O N2 começa quando o painel estiver publicado. Nele, os critérios 5 (medição de uso) e 7 (desempenho no ar) passam a contar.

| O que muda | Issue |
|---|---|
| Publicar o painel com link (Pages) e ligar a checagem de disponibilidade | [#230](https://github.com/learnTECH-community/formacao-dev/issues/230) |
| Proteger a `main` com ruleset, PR e o check `catalogo` | [#38](https://github.com/learnTECH-community/formacao-dev/issues/38) |
| Medir o uso do painel publicado, sem dado pessoal ([docs/dados-pessoais.md](docs/dados-pessoais.md)) | entra numa issue quando o painel estiver no ar |
| Medir o desempenho no ar, com o mesmo orçamento do CI (`npm run orcamento` e `npm run lcp`) | entra numa issue quando o painel estiver no ar |

## Depois · as trilhas abertas

O que a comunidade pode estudar e entregar. Os números saem de `node scripts/catalogo.mjs`, em 26/11/2026:

| Trilha | Feitos | Onde começar |
|---|---|---|
| T8 · Code review e colaboração | 0 de 13 | [mentoria](docs/comunidade/mentoria.md), degrau 2 (T8.1 e T8.2) |
| T11 · Comunidade e open source | 1 de 10 | [docs/comunidade](docs/comunidade/README.md) |
| T1 · Git e GitHub | 1 de 14 | issues de entrada ([#311](https://github.com/learnTECH-community/formacao-dev/issues/311)) |
| T0 · Fundamentos | 4 de 12 | [CATALOGO.md](CATALOGO.md) |
| T2 · Frontend base | 5 de 13 | é a trilha da hipótese ([#319](https://github.com/learnTECH-community/formacao-dev/issues/319)) |
| T3 · JavaScript e TypeScript | 5 de 14 | [CATALOGO.md](CATALOGO.md) |
| T9 · Entrega | 9 de 14 | depende da publicação ([#230](https://github.com/learnTECH-community/formacao-dev/issues/230)) |
| T7 · Qualidade | 10 de 14 | [CATALOGO.md](CATALOGO.md) |
| T6 · Bancos de dados | 12 de 13 | [CATALOGO.md](CATALOGO.md) |
| T4 · React | 13 de 15 | [CATALOGO.md](CATALOGO.md) |
| T10 · Segurança | 13 de 14 | [CATALOGO.md](CATALOGO.md) |
| T5 · Backend com Node e APIs | 15 de 15 | completa |

Um item novo no catálogo entra pelo modelo "Novo item do catálogo" ([CONTRIBUTING](CONTRIBUTING.md#novo-item-do-catálogo)).

## Fora do roadmap

Login e perfil, ranking no painel publicado, certificados e espelhar o roadmap.sh. O motivo de cada um está em [docs/MVP.md](docs/MVP.md), "Fora do MVP".
