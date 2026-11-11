// T5.5: limite de pedidos por minuto, com 429 e Retry-After.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITE_PADRAO_POR_MINUTO, limiteDoAmbiente } from '../src/limite.mjs';
import { subir } from './apoio.mjs';

function relogio() {
  let agora = Date.parse('2026-11-10T12:00:00Z');
  return { relogio: () => new Date(agora), avancar: (s) => (agora += s * 1000) };
}

test('acima do limite por minuto, 429 com Retry-After e Problem Details', async (t) => {
  const r = relogio();
  const api = await subir({ limitePorMinuto: 3, relogio: r.relogio });
  t.after(api.fechar);
  const status = [];
  for (let i = 0; i < 3; i++) status.push((await fetch(`${api.base}/v1/health`)).status);
  r.avancar(15);
  const bloqueado = await fetch(`${api.base}/v1/catalogo`);
  assert.deepEqual(status, [200, 200, 200]);
  assert.equal(bloqueado.status, 429);
  assert.equal(bloqueado.headers.get('retry-after'), '45');
  assert.equal(bloqueado.headers.get('ratelimit-remaining'), '0');
  assert.match(bloqueado.headers.get('content-type'), /application\/problem\+json/);
  const corpo = await bloqueado.json();
  assert.equal(corpo.title, 'Pedidos demais');
  assert.equal(corpo.detail, 'Mais de 3 pedidos por minuto. Tente de novo em 45 s.');
});

test('a janela de um minuto passa e os pedidos voltam a ser aceitos', async (t) => {
  const r = relogio();
  const api = await subir({ limitePorMinuto: 1, relogio: r.relogio });
  t.after(api.fechar);
  assert.equal((await fetch(`${api.base}/v1/health`)).status, 200);
  assert.equal((await fetch(`${api.base}/v1/health`)).status, 429);
  r.avancar(60);
  const depois = await fetch(`${api.base}/v1/health`);
  assert.equal(depois.status, 200);
  assert.equal(depois.headers.get('ratelimit-limit'), '1');
});

test('o limite vem da variável LIMITE_POR_MINUTO; valor inválido cai no padrão', () => {
  assert.equal(limiteDoAmbiente('120'), 120);
  assert.equal(limiteDoAmbiente(undefined), LIMITE_PADRAO_POR_MINUTO);
  assert.equal(limiteDoAmbiente('0'), LIMITE_PADRAO_POR_MINUTO);
  assert.equal(limiteDoAmbiente('muitos'), LIMITE_PADRAO_POR_MINUTO);
});
