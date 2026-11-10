// T9.8: a checagem de disponibilidade, com um fetch simulado (nenhum endereço real).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conferir, enderecosValidos, tabela } from './disponibilidade.mjs';

const relogio = () => {
  let t = 0;
  return () => (t += 50);
};

test('endereço que responde 200 passa, com status e tempo', async () => {
  const r = await conferir('https://painel.exemplo/', { buscar: async () => new Response('ok'), agora: relogio() });
  assert.deepEqual(r, { url: 'https://painel.exemplo/', status: 200, ms: 50, ok: true });
});

test('500, falha de rede e demora contam como falha', async () => {
  assert.equal((await conferir('https://api.exemplo/v1/health', { buscar: async () => new Response('', { status: 500 }) })).ok, false);
  const rede = await conferir('https://api.exemplo/v1/health', {
    buscar: async () => {
      throw new TypeError('fetch failed');
    },
  });
  assert.deepEqual([rede.ok, rede.status], [false, 'falha de rede']);
  const lento = await conferir('https://api.exemplo/v1/health', {
    tempoLimite: 20,
    buscar: (_u, { signal }) => new Promise((_ok, falhar) => signal.addEventListener('abort', () => falhar(signal.reason))),
  });
  assert.deepEqual([lento.ok, lento.status], [false, 'sem resposta em 0.02 s']);
});

test('a tabela mostra só situação, endereço, status e tempo', () => {
  const texto = tabela(
    [
      { url: 'https://painel.exemplo/', status: 200, ms: 120, ok: true },
      { url: 'https://api.exemplo/v1/health', status: 503, ms: 80, ok: false },
    ],
    new Date('2026-11-10T12:00:00Z'),
  );
  assert.match(texto, /^### Disponibilidade em 2026-11-10T12:00:00\.000Z/);
  assert.match(texto, /\| ok \| https:\/\/painel\.exemplo\/ \| 200 \| 120 ms \|/);
  assert.match(texto, /\| FALHA \| https:\/\/api\.exemplo\/v1\/health \| 503 \| 80 ms \|/);
});

test('só endereços http e https entram', () => {
  assert.deepEqual(enderecosValidos(['https://a.exemplo/', '', 'nada', 'ftp://b.exemplo/', 'http://c.exemplo/x']), ['https://a.exemplo/', 'http://c.exemplo/x']);
});
