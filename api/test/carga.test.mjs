// T7.10: o script de carga. O teste completo (3 × 10 s por rota) roda à mão com
// "npm run carga"; aqui, o cálculo do p95 e uma rodada curta para o script não quebrar.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { META_P95_MS, ROTAS, medir, percentil, subirParaCarga } from '../carga/carga.mjs';

test('percentil pelo posto mais próximo', () => {
  const cem = Array.from({ length: 100 }, (_, i) => i + 1);
  assert.equal(percentil(cem, 95), 95);
  assert.equal(percentil(cem, 50), 50);
  assert.equal(percentil(cem, 100), 100);
  assert.equal(percentil([7], 95), 7);
  assert.ok(Number.isNaN(percentil([], 95)));
});

test('a meta e as rotas estão escritas no script', () => {
  assert.equal(META_P95_MS, 300);
  assert.ok(ROTAS.length >= 5);
});

test('uma rodada curta mede pedidos, erros e o p95', async (t) => {
  const api = await subirParaCarga();
  t.after(api.fechar);
  const r = await medir(`${api.base}/v1/health`, { conexoes: 5, segundos: 1 });
  assert.ok(r.pedidos > 0);
  assert.equal(r.erros, 0);
  assert.ok(r.p50 <= r.p95 && r.p95 <= r.p99 && r.p99 <= r.maximo);
});
