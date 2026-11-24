// T9.8: a checagem de disponibilidade, com um fetch simulado (nenhum endereço real).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { conferir, enderecosValidos, separarEnderecos, tabela } from './disponibilidade.mjs';

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
    // O timer do AbortSignal.timeout não segura o processo; este segura até o aborto.
    buscar: (_u, { signal }) =>
      new Promise((_ok, falhar) => {
        const segura = setTimeout(() => {}, 5_000);
        signal.addEventListener('abort', () => {
          clearTimeout(segura);
          falhar(signal.reason);
        });
      }),
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
  assert.match(texto, /^### Disponibilidade em 10\/11\/2026,? 09:00:00 \(Brasília\)/);
  assert.match(texto, /\| ok \| https:\/\/painel\.exemplo\/ \| 200 \| 120 ms \|/);
  assert.match(texto, /\| FALHA \| https:\/\/api\.exemplo\/v1\/health \| 503 \| 80 ms \|/);
});

test('só endereços http e https entram', () => {
  assert.deepEqual(enderecosValidos(['https://a.exemplo/', '', 'nada', 'ftp://b.exemplo/', 'http://c.exemplo/x']), ['https://a.exemplo/', 'http://c.exemplo/x']);
});

test('separarEnderecos: conta os descartados e ignora o texto vazio', () => {
  assert.deepEqual(separarEnderecos(['https://a.exemplo/', '', '  ', 'nada', 'ftp://b.exemplo/']), { validos: ['https://a.exemplo/'], descartados: 2 });
  assert.deepEqual(separarEnderecos([]), { validos: [], descartados: 0 });
});

// O script de verdade (checklist de autorrevisão, item 2), sem rede: só os casos sem endereço válido.
const SCRIPT = fileURLToPath(new URL('./disponibilidade.mjs', import.meta.url));
const rodar = (...args) => spawnSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8' });

test('script: sem endereço sai com 0; só endereço inválido sai com 1 e não mostra o texto', () => {
  const nada = rodar();
  assert.equal(nada.status, 0);
  assert.match(nada.stdout, /Nenhum endereço publicado/);
  assert.equal(rodar('', '').status, 0, 'variáveis vazias: nada publicado ainda');
  const errado = rodar('painel.exemplo sem http', 'ftp://x.exemplo/');
  assert.equal(errado.status, 1);
  assert.match(errado.stderr, /2 endereço\(s\) descartado\(s\): não é http\(s\)/);
  assert.doesNotMatch(errado.stderr + errado.stdout, /painel\.exemplo|ftp:/, 'o texto descartado não vai para o log');
});
