// T5.9: erros centralizados no formato Problem Details (RFC 9457).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subir } from './apoio.mjs';

const CAMPOS = ['type', 'title', 'status', 'detail'];

async function pedir(url, opcoes) {
  const resposta = await fetch(url, opcoes);
  return { status: resposta.status, tipo: resposta.headers.get('content-type'), corpo: await resposta.json() };
}

function conferirProblema(r, status) {
  assert.equal(r.status, status);
  assert.match(r.tipo, /^application\/problem\+json/);
  for (const campo of CAMPOS) assert.ok(campo in r.corpo, `sem "${campo}"`);
  assert.equal(r.corpo.status, status);
  assert.match(r.corpo.type, /^https:\/\/github\.com\/.+\/docs\/api\.md#/);
}

test('400: entrada inválida sai como Problem Details', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const r = await pedir(`${api.base}/v1/conclusoes`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  conferirProblema(r, 400);
  assert.equal(r.corpo.instance, '/v1/conclusoes');
});

test('404: rota que não existe sai como Problem Details', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const r = await pedir(`${api.base}/v1/nao-existe`);
  conferirProblema(r, 404);
  assert.equal(r.corpo.detail, 'A rota GET /v1/nao-existe não existe.');
});

test('413: corpo acima de 10 KB', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const r = await pedir(`${api.base}/v1/conclusoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item: 'x'.repeat(11_000) }),
  });
  conferirProblema(r, 413);
});

test('500: erro de código assíncrono chega ao middleware, sem a pilha na resposta', async (t) => {
  const registros = [];
  const api = await subir({
    lerCatalogo: async () => {
      await new Promise((r) => setTimeout(r, 5));
      throw new Error('disco cheio em /segredo/caminho');
    },
    log: { info: () => {}, error: (dados) => registros.push(dados) },
  });
  t.after(api.fechar);
  const r = await pedir(`${api.base}/v1/catalogo`);
  conferirProblema(r, 500);
  assert.equal(r.corpo.detail, 'Algo falhou do nosso lado. Tente de novo mais tarde.');
  const texto = JSON.stringify(r.corpo);
  assert.doesNotMatch(texto, /segredo|disco cheio|at /);
  // A pilha fica no log do servidor.
  assert.equal(registros.length, 1);
  assert.match(registros[0].pilha, /disco cheio/);
});
