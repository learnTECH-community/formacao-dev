// T10.10: só HTTPS, com HSTS. O proxy da hospedagem diz o protocolo em X-Forwarded-Proto.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { soHttpsDoAmbiente } from '../src/https.mjs';
import { subir } from './apoio.mjs';

const semSeguir = { redirect: 'manual' };

/** Pedido cru com o Host escolhido (o fetch não deixa trocar o Host). */
const pedir = (base, caminho, { method = 'GET', headers = {} } = {}) =>
  new Promise((pronto, falhar) => {
    const { hostname, port } = new URL(base);
    const p = request({ hostname, port, path: caminho, method, headers }, (r) => {
      r.resume();
      r.on('end', () => pronto({ status: r.statusCode, location: r.headers.location, hsts: r.headers['strict-transport-security'] }));
    });
    p.on('error', falhar);
    p.end();
  });

test('T10.10: toda resposta leva o HSTS de 1 ano, com os subdomínios', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  for (const caminho of ['/v1/health', '/v1/nao-existe']) {
    const r = await fetch(`${api.base}${caminho}`);
    assert.equal(r.headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains', caminho);
  }
});

test('T10.10: com SO_HTTPS, pedido que chegou em HTTP vira 308 para o mesmo endereço em HTTPS', async (t) => {
  const api = await subir({ soHttps: true });
  t.after(api.fechar);
  const r = await pedir(api.base, '/v1/itens?trilha=T1', { headers: { 'X-Forwarded-Proto': 'http', Host: 'api.exemplo.org' } });
  assert.equal(r.status, 308);
  assert.equal(r.location, 'https://api.exemplo.org/v1/itens?trilha=T1');
  // 308 mantém o método: um POST continua POST no HTTPS.
  const post = await pedir(api.base, '/v1/conclusoes', { method: 'POST', headers: { 'X-Forwarded-Proto': 'http', Host: 'api.exemplo.org' } });
  assert.equal(post.status, 308);
});

test('T10.10: com SO_HTTPS, pedido em HTTPS segue normal; Host estranho recebe 400', async (t) => {
  const api = await subir({ soHttps: true });
  t.after(api.fechar);
  const r = await fetch(`${api.base}/v1/health`, { headers: { 'X-Forwarded-Proto': 'https' } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('strict-transport-security'), 'max-age=31536000; includeSubDomains');
  // Só o primeiro valor da lista conta.
  const lista = await pedir(api.base, '/v1/health', { headers: { 'X-Forwarded-Proto': 'http, https', Host: 'api.exemplo.org' } });
  assert.equal(lista.status, 308);
  const estranho = await pedir(api.base, '/v1/health', { headers: { 'X-Forwarded-Proto': 'http', Host: 'exemplo.org@outro' } });
  assert.equal(estranho.status, 400);
});

test('T10.10: sem SO_HTTPS (local), o X-Forwarded-Proto não muda nada', async (t) => {
  const api = await subir({ soHttps: false });
  t.after(api.fechar);
  const r = await fetch(`${api.base}/v1/health`, { ...semSeguir, headers: { 'X-Forwarded-Proto': 'http' } });
  assert.equal(r.status, 200);
});

test('T10.10: SO_HTTPS aceita sim, 1 ou true', () => {
  for (const v of ['sim', 'SIM', '1', 'true']) assert.equal(soHttpsDoAmbiente(v), true, v);
  for (const v of [undefined, '', 'nao', '0', 'false']) assert.equal(soHttpsDoAmbiente(v), false, String(v));
});
