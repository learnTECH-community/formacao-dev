## Item do catálogo

Código: `T_._` · Issue: Closes #

## O que mudou

-

## Como testar

```bash
npm test
```

## Evidência

(saída do teste, print ou link)

## Pronto com UX, UI e QA

Marque o que fez. Se um item não se aplica, escreva "não se aplica" na linha, sem apagá-la. O porquê de cada item está no [CONTRIBUTING](https://github.com/learnTECH-community/formacao-dev/blob/main/CONTRIBUTING.md#pronto-com-ux-ui-e-qa).

**UX**
- [ ] A tarefa de quem usa cabe em até 3 passos.
- [ ] Os textos são claros e dizem o que fazer, e não só o problema.
- [ ] Os estados de erro, de vazio e de carregamento estão tratados.

**UI**
- [ ] Usei os tokens do painel (cores, espaços, fontes), sem valor solto.
- [ ] Os prints em 360, 768 e 1440 px, nos temas claro e escuro, estão na Evidência.
- [ ] O contraste é AA, o foco fica visível e os alvos de toque têm pelo menos 44 px.
- [ ] Toda imagem tem `alt`; uma imagem só de enfeite usa `alt=""`.

**QA**
- [ ] `npm test` e `npm run test:e2e` passam, e o axe não acusa violação.
- [ ] `npm run lcp` e `npm run orcamento` ficam dentro do limite.
- [ ] Não há dado pessoal nem segredo no código, nos prints ou nos logs.

## Conferência

- [ ] O item está marcado com `[x]` no `CATALOGO.md`.
- [ ] Rodei `node scripts/catalogo.mjs --atualizar`.
- [ ] O CI está verde.
- [ ] Se criei ou mudei uma rota da API, ou passei a guardar um dado novo, revi a modelagem de ameaças (`docs/ameacas.md`) e os dados pessoais (`docs/dados-pessoais.md`).

> Relatório dos testes no navegador: na página do run do CI (aba **Checks** → **CI** → **Summary**), em **Artifacts**, baixe `playwright-report` e abra o `index.html`. Se algum teste falhou, o artefato `painel-test-results` traz o trace (abra com `npx playwright show-trace trace.zip`) e o print. Os artefatos ficam 14 dias.
