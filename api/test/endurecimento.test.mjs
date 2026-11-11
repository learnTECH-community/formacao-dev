// T10.3: cabeçalhos de segurança (helmet) e CORS só para o site do painel.
// T10.14: API endurecida: limite de corpo, sem X-Powered-By, tempos limite e
// erro 500 sem detalhe interno com NODE_ENV=production.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { connect } from 'node:net';
import { criarApp } from '../src/app.mjs';
import { criarRepositorioEmMemoria } from '../src/repositorios/memoria.mjs';
import { opcoesDoServidor } from '../src/tempos.mjs';
import { CATALOGO_DE_TESTE, GITHUB_PARADO, LOG_MUDO, subir } from './apoio.mjs';

const PAINEL = 'http://127.0.0.1:4317';

test('T10.3: o helmet manda os cabeçalhos de segurança em toda resposta, inclusive nos erros', async (t) => {
  const api = await subir({ origens: [PAINEL] });
  t.after(api.fechar);
  for (const caminho of ['/v1/health', '/v1/nao-existe']) {
    const r = await fetch(`${api.base}${caminho}`);
    assert.equal(r.headers.get('x-content-type-options'), 'nosniff', caminho);
    assert.equal(r.headers.get('x-frame-options'), 'SAMEORIGIN', caminho);
    assert.equal(r.headers.get('referrer-policy'), 'no-referrer', caminho);
    assert.equal(r.headers.get('cross-origin-opener-policy'), 'same-origin', caminho);
    assert.match(r.headers.get('content-security-policy'), /default-src 'self'/, caminho);
    assert.match(r.headers.get('content-security-policy'), /frame-ancestors 'self'/, caminho);
    assert.equal(r.headers.get('x-powered-by'), null, caminho);
  }
});

test('T10.3: o preflight de outra origem não recebe permissão de CORS; o do painel recebe', async (t) => {
  const api = await subir({ origens: [PAINEL] });
  t.after(api.fechar);
  const preflight = (origem) =>
    fetch(`${api.base}/v1/conclusoes`, { method: 'OPTIONS', headers: { Origin: origem, 'Access-Control-Request-Method': 'POST' } });
  const doPainel = await preflight(PAINEL);
  assert.equal(doPainel.status, 204);
  assert.equal(doPainel.headers.get('access-control-allow-origin'), PAINEL);
  assert.equal(doPainel.headers.get('access-control-allow-credentials'), 'true');
  const deFora = await preflight('https://site-malicioso.exemplo');
  assert.equal(deFora.headers.get('access-control-allow-origin'), null);
  assert.equal(deFora.headers.get('access-control-allow-credentials'), null);
  // Sem nenhuma origem configurada, ninguém recebe CORS (nem o curinga).
  const fechada = await subir({ origens: [] });
  t.after(fechada.fechar);
  const r = await fetch(`${fechada.base}/v1/catalogo`, { headers: { Origin: PAINEL } });
  assert.equal(r.headers.get('access-control-allow-origin'), null);
});

test('T10.14: corpo acima do limite recebe 413, sem X-Powered-By', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const r = await fetch(`${api.base}/v1/conclusoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: api.cookieDe() },
    body: JSON.stringify({ item: 'T1.1', usuario: 'x'.repeat(20_000) }),
  });
  assert.equal(r.status, 413);
  assert.equal(r.headers.get('x-powered-by'), null);
});

test('T10.14: tempos limite configurados, com padrão e por variável', () => {
  assert.deepEqual(opcoesDoServidor({}), { requestTimeout: 15_000, headersTimeout: 10_000, keepAliveTimeout: 5_000, maxHeaderSize: 16_384 });
  assert.equal(opcoesDoServidor({ TEMPO_DO_PEDIDO_EM_MS: '3000' }).requestTimeout, 3000);
  // Os cabeçalhos não podem esperar mais que o pedido inteiro.
  assert.equal(opcoesDoServidor({ TEMPO_DO_PEDIDO_EM_MS: '3000' }).headersTimeout, 3000);
  // Valor inválido cai no padrão.
  assert.equal(opcoesDoServidor({ TEMPO_DO_PEDIDO_EM_MS: 'abc' }).requestTimeout, 15_000);
});

test('T10.14: cliente lento que não termina o pedido recebe 408 e a conexão fecha', async (t) => {
  const app = criarApp({ repositorio: criarRepositorioEmMemoria(), lerCatalogo: async () => CATALOGO_DE_TESTE, log: LOG_MUDO, github: GITHUB_PARADO });
  const opcoes = opcoesDoServidor({ TEMPO_DO_PEDIDO_EM_MS: '300' });
  const servidor = createServer({ ...opcoes, connectionsCheckingInterval: 50 }, app);
  await new Promise((pronto) => servidor.listen(0, '127.0.0.1', pronto));
  t.after(() => new Promise((r) => servidor.close(r)));
  const inicio = Date.now();
  const resposta = await new Promise((pronto, falhar) => {
    const socket = connect(servidor.address().port, '127.0.0.1', () => {
      // Manda só metade dos cabeçalhos e fica parado.
      socket.write('GET /v1/health HTTP/1.1\r\nHost: 127.0.0.1\r\n');
    });
    let recebido = '';
    socket.on('data', (d) => (recebido += d));
    socket.on('close', () => pronto(recebido));
    socket.on('error', falhar);
  });
  assert.match(resposta, /^HTTP\/1\.1 408/);
  assert.ok(Date.now() - inicio < 5_000, 'fechou bem antes do padrão');
});

test('T10.14: com NODE_ENV=production, o erro 500 sai sem pilha nem mensagem interna', async (t) => {
  const anterior = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  t.after(() => {
    if (anterior === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = anterior;
  });
  const api = await subir({
    lerCatalogo: async () => {
      throw new Error('falha interna em /srv/app/src/catalogo.mjs');
    },
  });
  t.after(api.fechar);
  assert.equal(api.app.get('env'), 'production');
  const r = await fetch(`${api.base}/v1/catalogo`);
  assert.equal(r.status, 500);
  assert.equal(r.headers.get('content-type'), 'application/problem+json; charset=utf-8');
  const texto = await r.text();
  assert.doesNotMatch(texto, /falha interna|\/srv\/app|catalogo\.mjs|\bat \w/);
  assert.equal(JSON.parse(texto).detail, 'Algo falhou do nosso lado. Tente de novo mais tarde.');
});
