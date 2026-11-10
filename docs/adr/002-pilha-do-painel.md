# ADR 002 · Pilha do Painel de Formação

**Data:** 10/11/2026 · **Situação:** aceita

## Contexto

O Painel de Formação é o projeto prático do catálogo. Ele lê o `CATALOGO.md` e mostra o progresso de cada trilha. O mesmo código precisa servir de exercício para trilhas diferentes: HTML e CSS (T2), JavaScript e TypeScript (T3), React (T4), API (T5), testes (T7) e publicação (T9).

Quem contribui está aprendendo. A pilha precisa ser pequena no começo e crescer junto com as trilhas, sem reescrever tudo a cada passo.

## Opções

| Opção | Prós | Contras |
|---|---|---|
| **A. HTML, CSS e JavaScript sem framework, com Vite e TypeScript quando a T3 pedir** | Começa com um arquivo `index.html` que abre no navegador. Cada trilha acrescenta uma camada: o Vite entra para o build, o TypeScript para os tipos, o React na T4. Pouca dependência para auditar | A troca para React (T4) reescreve a parte de tela. Sem framework, o código de interface fica mais verboso |
| B. React com Vite desde o primeiro dia | Uma pilha só do começo ao fim. Componentes prontos para a T4 | Quem chega pela T2 precisa entender JSX, build e npm antes de praticar HTML semântico. Esconde o que a T2 e a T3 querem ensinar |
| C. Gerador de site estático (Eleventy ou Astro) | Lê Markdown sem esforço. Página leve e pronta para o Pages | Mais uma ferramenta para aprender, fora das trilhas do catálogo. A lógica de leitura do catálogo fica escondida no gerador, e a T3.1 perde o sentido |

## Decisão

Opção **A**.

- **T2:** `painel/index.html`, `painel/estilo.css` e JavaScript sem framework. Nada de build.
- **T3:** o Vite entra como servidor de desenvolvimento e build (`painel/` é a raiz). O painel busca o `CATALOGO.md` com `fetch`. O TypeScript entra na T3.4, com `strict`.
- **Testes:** Vitest para as funções (leitura do catálogo, progresso, filtro) e Playwright com `@axe-core/playwright` para a página no navegador (teclado, temas, larguras, falhas).
- **T4 em diante:** o React entra por cima do que existir, numa ADR nova se mudar a estrutura de pastas.

## O que é preciso saber para contribuir

- Node 20 ou mais novo e npm. Os comandos estão no README, seção "Rodar o painel".
- O código do painel fica em `painel/`. O catálogo continua na raiz e é a única fonte dos dados: o painel não guarda cópia dele.
- Funções que calculam ou transformam dados ficam separadas da parte que mexe na página, para ter teste de unidade.
- Toda mudança de tela precisa passar no teste do navegador com axe, nos temas claro e escuro.

## Consequências

- A T4 vai reescrever a camada de tela em React. As funções puras (leitura, progresso, filtro) continuam.
- Poucas dependências: Vite, TypeScript, Vitest e Playwright, todas de desenvolvimento.

## Como desfazer

Escrever uma ADR nova que substitua esta, dizendo a pilha nova e o motivo. Como as funções puras ficam separadas da tela, trocar a tela (por React ou por um gerador estático) não muda os dados nem os testes de unidade.
