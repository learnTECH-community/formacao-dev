// T5.10: logs estruturados em JSON, com id do pedido e sem dado pessoal ou token.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarLog, semDadosSensiveis } from '../src/log.mjs';
import { subir } from './apoio.mjs';

function logEmMemoria(nivel = 'info') {
  const linhas = [];
  const log = criarLog({ nivel, escrever: (l) => linhas.push(l), relogio: () => new Date('2026-11-10T12:00:00.000Z') });
  return { log, linhas, registros: () => linhas.map((l) => JSON.parse(l)) };
}

const esperarLog = () => new Promise((r) => setTimeout(r, 20));

test('cada pedido registra método, rota, status e tempo, numa linha JSON', async (t) => {
  const { log, linhas, registros } = logEmMemoria();
  const api = await subir({ log });
  t.after(api.fechar);
  await fetch(`${api.base}/v1/catalogo?trilha=T1`);
  await esperarLog();
  assert.equal(linhas.length, 1);
  const [r] = registros();
  assert.equal(r.hora, '2026-11-10T12:00:00.000Z');
  assert.equal(r.nivel, 'info');
  assert.equal(r.msg, 'pedido');
  assert.equal(r.metodo, 'GET');
  assert.equal(r.rota, '/v1/catalogo');
  assert.equal(r.status, 200);
  assert.equal(typeof r.ms, 'number');
  // A query não vai para o log.
  assert.doesNotMatch(linhas[0], /trilha=T1/);
});

test('o id do pedido vai no cabeçalho da resposta e no log', async (t) => {
  const { log, registros } = logEmMemoria();
  const api = await subir({ log });
  t.after(api.fechar);
  const resposta = await fetch(`${api.base}/v1/health`);
  await esperarLog();
  const id = resposta.headers.get('x-request-id');
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.equal(registros()[0].id, id);
});

test('um id válido que chega no pedido é mantido; um id estranho é trocado', async (t) => {
  const { log } = logEmMemoria();
  const api = await subir({ log });
  t.after(api.fechar);
  const mantido = await fetch(`${api.base}/v1/health`, { headers: { 'X-Request-Id': 'pedido-do-proxy-123' } });
  assert.equal(mantido.headers.get('x-request-id'), 'pedido-do-proxy-123');
  const trocado = await fetch(`${api.base}/v1/health`, { headers: { 'X-Request-Id': '<script>' } });
  assert.notEqual(trocado.headers.get('x-request-id'), '<script>');
});

test('erro 4xx sai como warn e 5xx como error', async (t) => {
  const { log, registros } = logEmMemoria();
  const api = await subir({ log });
  t.after(api.fechar);
  await fetch(`${api.base}/v1/nao-existe`);
  await esperarLog();
  assert.deepEqual(
    registros().map((r) => [r.nivel, r.status, r.rota]),
    [['warn', 404, '(sem rota)']],
  );
});

test('nenhum dado pessoal ou token no log, nem no corpo nem nos cabeçalhos', async (t) => {
  const { log, linhas } = logEmMemoria('debug');
  const api = await subir({ log });
  t.after(api.fechar);
  await fetch(`${api.base}/v1/conclusoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer token-ficticio-123', Cookie: 'sessao=abc' },
    body: JSON.stringify({ item: 'T1.1', usuario: 'pessoa-ficticia', pr: 'https://github.com/exemplo/repo/pull/1' }),
  });
  await esperarLog();
  const tudo = linhas.join('\n');
  assert.ok(tudo.length > 0);
  for (const proibido of ['pessoa-ficticia', 'token-ficticio-123', 'sessao=abc', 'pull/1']) assert.ok(!tudo.includes(proibido), proibido);
});

test('semDadosSensiveis troca token, senha, cookie e usuário em qualquer profundidade', () => {
  assert.deepEqual(semDadosSensiveis({ a: 1, token: 'x', dentro: { Authorization: 'y', lista: [{ senha: 'z', usuario: 'w' }] } }), {
    a: 1,
    token: '[omitido]',
    dentro: { Authorization: '[omitido]', lista: [{ senha: '[omitido]', usuario: '[omitido]' }] },
  });
});

test('o nível do log vem da variável e filtra o que fica abaixo dele', () => {
  const { log, registros } = logEmMemoria('warn');
  log.debug({ msg: 'a' });
  log.info({ msg: 'b' });
  log.warn({ msg: 'c' });
  log.error({ msg: 'd' });
  assert.deepEqual(
    registros().map((r) => r.msg),
    ['c', 'd'],
  );
  const antes = process.env.NIVEL_DO_LOG;
  process.env.NIVEL_DO_LOG = 'error';
  try {
    const linhas = [];
    const doAmbiente = criarLog({ escrever: (l) => linhas.push(l) });
    doAmbiente.warn({ msg: 'x' });
    doAmbiente.error({ msg: 'y' });
    assert.equal(linhas.length, 1);
  } finally {
    if (antes === undefined) delete process.env.NIVEL_DO_LOG;
    else process.env.NIVEL_DO_LOG = antes;
  }
  assert.throws(() => criarLog({ nivel: 'tudo' }), /NIVEL_DO_LOG inválido/);
});
