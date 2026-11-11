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

## Conferência

- [ ] O item está marcado com `[x]` no `CATALOGO.md`.
- [ ] Rodei `node scripts/catalogo.mjs --atualizar`.
- [ ] O CI está verde.
- [ ] Se criei ou mudei uma rota da API, ou passei a guardar um dado novo, revi a modelagem de ameaças (`docs/ameacas.md`) e os dados pessoais (`docs/dados-pessoais.md`).

> Relatório dos testes no navegador: na página do run do CI (aba **Checks** → **CI** → **Summary**), em **Artifacts**, baixe `playwright-report` e abra o `index.html`. Se algum teste falhou, o artefato `painel-test-results` traz o trace (abra com `npx playwright show-trace trace.zip`) e o print. Os artefatos ficam 14 dias.
