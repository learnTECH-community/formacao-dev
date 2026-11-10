# ADR 003 · React no Painel de Formação

**Data:** 10/11/2026 · **Situação:** aceita · Complementa a [ADR 002](002-pilha-do-painel.md)

## Contexto

A ADR 002 previu o React na trilha T4, por cima do que a T2 e a T3 deixaram: HTML semântico, CSS com tokens, Vite e TypeScript `strict`, e as funções puras de leitura, progresso e filtro. A tela era montada com a API do DOM em `tela.ts` e `main.ts`.

## Decisão

- **React 19** com `@vitejs/plugin-react`, seguindo o modelo `react-ts` do Vite (`npm create vite@latest -- --template react-ts`, lido em 10/11/2026).
- **O app monta a página inteira** em `<div id="app">`: cabeçalho, conteúdo e rodapé. O `index.html` guarda só o `<head>` e o aviso de `noscript`.
- **Componentes em `painel/src/componentes/`**, um por arquivo, com props tipadas. As funções puras (`catalogo.ts`, `progresso.ts`, `filtro.ts`) não mudam.
- **A busca do catálogo fica no hook `useCatalogo`**, que devolve carregando, erro, vazio ou pronto e cancela o pedido ao sair da página.
- **O tema:** um script inline no `<head>` do `index.html` (era o `public/tema.js` até a T7.12), só para aplicar a escolha guardada antes da primeira pintura. O botão virou o componente `BotaoTema`.
- **Lint com oxlint**, como no modelo do Vite, com os plugins `react`, `typescript` e `jsx-a11y`. A regra `jsx-a11y/prefer-tag-over-role` fica desligada: o painel usa `role="progressbar"` e `role="status"` de propósito, porque o elemento `progress` não aceita o texto equivalente nem o estilo dos tokens em todos os navegadores.
- **Rotas com React Router (T4.2 e T4.3):** `BrowserRouter`, com o filtro na busca do endereço (`?trilha=T2&situacao=feitos`) e o detalhe em `/trilha/T2`. Rotas por `#` foram descartadas porque o painel usa âncoras (`#conteudo`, `#trilhas`) no link de pular e no menu. Por isso a base do Vite passou de `./` para `/` (ou `BASE_DO_PAINEL`), e o build copia o `index.html` para `404.html`.
- **Estado compartilhado (T4.8):** tema e itens fixados num `useReducer` com ações tipadas, num provedor só (`PreferenciasProvider`) no topo, com dois contextos: estado e ações. Os fixados ficam no `localStorage` (`painel-fixados`); valor estranho é descartado e armazenamento bloqueado não quebra a página.
- **Nada de `dangerouslySetInnerHTML`:** o texto do catálogo continua texto (regra `react/no-danger`).

## Consequências

- O primeiro HTML chega vazio e o React desenha a página. O peso do JS sobe de alguns KB para cerca de 72 KB comprimidos; a T7.3 mede o LCP e a T7.12 põe um limite.
- Os testes no navegador (Playwright e axe) não mudaram: a página tem os mesmos papéis, nomes, ids e classes.

## Como desfazer

Voltar a `tela.ts` e `main.ts` pelo histórico do Git e tirar o React do `package.json`. As funções puras e os testes delas não mudam.
