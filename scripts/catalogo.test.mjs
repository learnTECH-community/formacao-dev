import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { lerCatalogo, progresso, linhaProgresso } from './catalogo.mjs';

const exemplo = `## T1 · Git
- [x] **T1.1** fluxo
- [ ] **T1.2** issue
## T2 · Frontend
- [ ] **T2.1** html`;

test('lê trilhas e itens e calcula o progresso', () => {
  const { trilhas, erros } = lerCatalogo(exemplo);
  assert.deepEqual(erros, []);
  assert.equal(trilhas.length, 2);
  assert.deepEqual(progresso(trilhas), { feitos: 1, total: 3 });
  assert.equal(linhaProgresso(progresso(trilhas)), '**Progresso:** 1 de 3 itens');
});

test('acusa código repetido, item na trilha errada e formato inválido', () => {
  const { erros } = lerCatalogo(`## T1 · Git
- [ ] **T1.1** a
- [ ] **T1.1** b
- [ ] **T2.1** c
- [] T1.3 sem formato`);
  assert.equal(erros.length, 3);
});

test('o CATALOGO.md real está válido e a linha de progresso bate', () => {
  const texto = readFileSync(new URL('../CATALOGO.md', import.meta.url), 'utf8');
  const { trilhas, erros } = lerCatalogo(texto);
  assert.deepEqual(erros, []);
  assert.ok(texto.includes(linhaProgresso(progresso(trilhas))));
});
