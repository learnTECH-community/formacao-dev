// T7.3: leitura do relatório do Lighthouse, execuções válidas e mediana.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerRelatorio, mediana, valida } from './lcp.mjs';

const relatorio = (lcp, tbt, fcp, erro) => ({
  runtimeError: erro ? { code: erro } : undefined,
  audits: {
    'largest-contentful-paint': { numericValue: lcp },
    'total-blocking-time': { numericValue: tbt },
    'cumulative-layout-shift': { numericValue: 0.0123 },
    metrics: { details: { items: [{ observedFirstContentfulPaint: fcp }] } },
    'largest-contentful-paint-element': { details: { items: [{ items: [{ node: { snippet: '<p class="resumo">' } }] }] } },
  },
});

test('lê LCP, TBT, CLS, FCP observado e o elemento do LCP', () => {
  assert.deepEqual(lerRelatorio(relatorio(1569.4, 120.6, 305)), {
    erro: null, lcp: 1569, tbt: 121, cls: 0.012, fcpObservado: 305, elemento: '<p class="resumo">',
  });
});

test('descarta execução com erro ou com máquina sobrecarregada', () => {
  assert.equal(valida(lerRelatorio(relatorio(1500, 100, 300))), true);
  assert.equal(valida(lerRelatorio(relatorio(1500, 100, 300, 'NO_FCP'))), false);
  assert.equal(valida(lerRelatorio(relatorio(1500, 100, 6000))), false);
  assert.equal(valida(lerRelatorio(relatorio(1500, 9000, 300))), false);
});

test('mediana de 3 e de 4 valores', () => {
  assert.equal(mediana([1573, 1509, 1569]), 1569);
  assert.equal(mediana([1, 2, 3, 4]), 3);
});
