// T10.8: sessão protegida contra roubo e CSRF.
// T10.9: cookie da sessão assinado com HMAC, chave do ambiente e troca de chave.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { assinar, chavesDaSessao, criarSessoes } from '../src/autenticacao.mjs';
import { subir } from './apoio.mjs';

const PAINEL = 'http://127.0.0.1:4317';
const CHAVE = 'chave-ficticia-de-teste-com-32-caracteres-ou-mais';
const OUTRA = 'outra-chave-ficticia-de-teste-com-32-caracteres';
const CONCLUSAO = { item: 'T1.2', usuario: 'pessoa-ficticia', pr: 'https://github.com/exemplo/repo/pull/3' };

const registrar = (api, cabecalhos = {}) =>
  fetch(`${api.base}/v1/conclusoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: api.cookieDe(), ...cabecalhos },
    body: JSON.stringify(CONCLUSAO),
  });

// T10.8

test('T10.8: POST com sessão válida, vindo de outra origem, é recusado com 403 e não grava', async (t) => {
  const api = await subir({ origens: [PAINEL] });
  t.after(api.fechar);
  for (const origem of ['https://site-malicioso.exemplo', 'null', 'http://127.0.0.1:4317.exemplo']) {
    const r = await registrar(api, { Origin: origem });
    assert.equal(r.status, 403, origem);
    assert.match((await r.json()).detail, /outra origem/);
  }
  // Sem Origin, mas o navegador diz que veio de outro site.
  assert.equal((await registrar(api, { 'Sec-Fetch-Site': 'cross-site' })).status, 403);
  assert.deepEqual(await api.repositorio.listarConclusoes(), []);
});

test('T10.8: POST do painel (origem aceita) passa; fora do navegador (sem Origin) também', async (t) => {
  const api = await subir({ origens: [PAINEL] });
  t.after(api.fechar);
  assert.equal((await registrar(api, { Origin: PAINEL, 'Sec-Fetch-Site': 'same-site' })).status, 201);
  assert.equal((await registrar(api)).status, 200);
});

test('T10.8: GET de outra origem não é barrado pela checagem (só lê, e o CORS não libera a resposta)', async (t) => {
  const api = await subir({ origens: [PAINEL] });
  t.after(api.fechar);
  const r = await fetch(`${api.base}/v1/catalogo`, { headers: { Origin: 'https://site-malicioso.exemplo' } });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('access-control-allow-origin'), null);
});

test('T10.8: pedido sem sessão (sem o cookie) recebe 401', async (t) => {
  const api = await subir({ origens: [PAINEL] });
  t.after(api.fechar);
  const r = await fetch(`${api.base}/v1/conclusoes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: PAINEL }, body: JSON.stringify(CONCLUSAO) });
  assert.equal(r.status, 401);
});

test('T10.8: o login troca o id: a sessão que vinha no cookie antes do login deixa de valer', async (t) => {
  const CONFIG = { clienteId: 'id-ficticio', segredo: 'segredo-ficticio', urlDeRetorno: 'http://127.0.0.1/v1/auth/retorno', urlDoPainel: `${PAINEL}/`, mantenedores: [] };
  const buscar = async (url) =>
    url.includes('access_token') ? Response.json({ access_token: 'token-ficticio' }) : Response.json({ login: 'pessoa-ficticia' });
  const api = await subir({ configDoLogin: CONFIG, buscarNoGitHub: buscar });
  t.after(api.fechar);
  const plantada = api.cookieDe('pessoa-plantada', 'pessoa');
  const entrada = await fetch(`${api.base}/v1/auth/entrar`, { redirect: 'manual' });
  const state = new URL(entrada.headers.get('location')).searchParams.get('state');
  const cookieDoState = entrada.headers.getSetCookie()[0].split(';')[0];
  const retorno = await fetch(`${api.base}/v1/auth/retorno?code=bom&state=${state}`, { redirect: 'manual', headers: { Cookie: `${cookieDoState}; ${plantada}` } });
  const nova = retorno.headers.getSetCookie().find((c) => c.startsWith('sessao=')).split(';')[0];
  assert.notEqual(nova, plantada);
  assert.equal((await fetch(`${api.base}/v1/auth/eu`, { headers: { Cookie: plantada } })).status, 401);
  assert.deepEqual(await (await fetch(`${api.base}/v1/auth/eu`, { headers: { Cookie: nova } })).json(), { usuario: 'pessoa-ficticia', papel: 'pessoa' });
});

test('T10.8: a sessão expira (8 horas) e o cookie sai com Max-Age e HttpOnly, Secure e SameSite=Lax', () => {
  let agora = 0;
  const sessoes = criarSessoes({ agora: () => agora, chaves: [CHAVE] });
  const valor = sessoes.criar('pessoa-a', 'pessoa');
  agora = 8 * 3_600_000 - 1;
  assert.ok(sessoes.ler(valor));
  agora = 8 * 3_600_000;
  assert.equal(sessoes.ler(valor), null);
  const fonte = readFileSync(new URL('../src/autenticacao.mjs', import.meta.url), 'utf8');
  assert.match(fonte, /httpOnly: true, secure: true, sameSite: 'lax'/);
  assert.match(fonte, /maxAge: HORAS_DA_SESSAO \* 3_600_000/);
});

// T10.9

test('T10.9: o cookie leva o id e a assinatura HMAC-SHA256 do id', () => {
  const sessoes = criarSessoes({ chaves: [CHAVE] });
  const valor = sessoes.criar('pessoa-a', 'pessoa');
  const [id, assinatura] = valor.split('.');
  assert.match(id, /^[\w-]{43}$/);
  assert.equal(assinatura, assinar(id, CHAVE));
  assert.deepEqual(sessoes.ler(valor), { usuario: 'pessoa-a', papel: 'pessoa' });
});

test('T10.9: cookie alterado (id, assinatura ou formato) é recusado', async (t) => {
  const sessoes = criarSessoes({ chaves: [CHAVE] });
  const valor = sessoes.criar('pessoa-a', 'mantenedor');
  const [id, assinatura] = valor.split('.');
  const trocaUm = (texto) => (texto[0] === 'A' ? 'B' : 'A') + texto.slice(1);
  for (const alterado of [`${trocaUm(id)}.${assinatura}`, `${id}.${trocaUm(assinatura)}`, id, `${id}.`, `.${assinatura}`, `${id}.${assinar(id, OUTRA)}`, '']) {
    assert.equal(sessoes.ler(alterado), null, alterado);
    assert.equal(sessoes.apagar(alterado), false, alterado);
  }
  // Pela API: o cookie com a assinatura trocada não abre a rota protegida.
  const api = await subir({ chavesDaSessao: [CHAVE] });
  t.after(api.fechar);
  const bom = api.cookieDe();
  assert.equal((await fetch(`${api.base}/v1/auth/eu`, { headers: { Cookie: bom } })).status, 200);
  const ruim = `${bom.slice(0, -2)}${bom.endsWith('AA') ? 'BB' : 'AA'}`;
  assert.equal((await fetch(`${api.base}/v1/auth/eu`, { headers: { Cookie: ruim } })).status, 401);
});

test('T10.9: troca de chave: com a anterior na lista, as sessões abertas seguem; sem ela, caem', () => {
  const armazem = new Map();
  const antes = criarSessoes({ chaves: [CHAVE], armazem });
  const valor = antes.criar('pessoa-a', 'pessoa');
  // Chave nova na frente e a anterior só para conferir.
  const durante = criarSessoes({ chaves: [OUTRA, CHAVE], armazem });
  assert.deepEqual(durante.ler(valor), { usuario: 'pessoa-a', papel: 'pessoa' });
  const nova = durante.criar('pessoa-b', 'pessoa');
  assert.equal(nova.split('.')[1], assinar(nova.split('.')[0], OUTRA));
  // Depois de tirar a anterior, a sessão antiga cai e a nova segue.
  const depois = criarSessoes({ chaves: [OUTRA], armazem });
  assert.equal(depois.ler(valor), null);
  assert.deepEqual(depois.ler(nova), { usuario: 'pessoa-b', papel: 'pessoa' });
});

test('T10.9: a chave vem do ambiente, com pelo menos 32 caracteres, e fica vazia no .env.example', () => {
  assert.deepEqual(chavesDaSessao({ CHAVE_DA_SESSAO: CHAVE }), [CHAVE]);
  assert.deepEqual(chavesDaSessao({ CHAVE_DA_SESSAO: OUTRA, CHAVE_DA_SESSAO_ANTERIOR: CHAVE }), [OUTRA, CHAVE]);
  assert.throws(() => chavesDaSessao({ CHAVE_DA_SESSAO: 'curta' }), /32 caracteres/);
  // Sem a variável, uma chave aleatória por início.
  const [a] = chavesDaSessao({});
  const [b] = chavesDaSessao({});
  assert.ok(a.length >= 32);
  assert.notEqual(a, b);
  const exemplo = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
  assert.match(exemplo, /^CHAVE_DA_SESSAO=$/m);
  assert.match(exemplo, /^CHAVE_DA_SESSAO_ANTERIOR=$/m);
});

test('T10.9: a assinatura é comparada em tempo constante (timingSafeEqual)', () => {
  const fonte = readFileSync(new URL('../src/autenticacao.mjs', import.meta.url), 'utf8');
  assert.match(fonte, /const iguais = .*timingSafeEqual\(/);
  assert.match(fonte, /ok = iguais\(assinatura, assinar\(id, chave\)\) \|\| ok/);
});
