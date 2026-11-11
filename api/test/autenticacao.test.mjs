// T5.13: entrar com a conta do GitHub (provedor simulado, nomes fictícios).
// T5.14: papéis checados no servidor: 401 sem sessão, 403 sem o papel.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { configDoAmbiente, criarSessoes, lerCookies, papelDe } from '../src/autenticacao.mjs';
import { subir } from './apoio.mjs';

const CONFIG = {
  clienteId: 'id-ficticio',
  segredo: 'segredo-ficticio',
  urlDeRetorno: 'http://127.0.0.1:4320/v1/auth/retorno',
  urlDoPainel: 'http://127.0.0.1:4317/',
  mantenedores: ['pessoa-mantenedora'],
};

/** GitHub simulado: troca o code "bom" por um token e devolve o login. */
function provedor(login = 'pessoa-mantenedora') {
  const pedidos = [];
  const buscar = async (url, opcoes = {}) => {
    pedidos.push({ url, opcoes });
    if (url === 'https://github.com/login/oauth/access_token') {
      const { code, client_secret } = JSON.parse(opcoes.body);
      const ok = code === 'bom' && client_secret === CONFIG.segredo;
      return Response.json(ok ? { access_token: 'token-ficticio', token_type: 'bearer' } : { error: 'bad_verification_code' });
    }
    if (url === 'https://api.github.com/user') {
      return opcoes.headers.Authorization === 'Bearer token-ficticio' ? Response.json({ login }) : new Response('', { status: 401 });
    }
    throw new Error(`pedido inesperado: ${url}`);
  };
  return { buscar, pedidos };
}

const semSeguir = { redirect: 'manual' };
const cookiesDa = (resposta) => resposta.headers.getSetCookie();

/** Percorre o login inteiro e devolve o cookie da sessão. */
async function entrar(api, { code = 'bom' } = {}) {
  const entrada = await fetch(`${api.base}/v1/auth/entrar`, semSeguir);
  const destino = new URL(entrada.headers.get('location'));
  const state = destino.searchParams.get('state');
  const cookieDoState = cookiesDa(entrada)[0].split(';')[0];
  const retorno = await fetch(`${api.base}/v1/auth/retorno?code=${code}&state=${state}`, { ...semSeguir, headers: { Cookie: cookieDoState } });
  return { entrada, destino, retorno, sessao: cookiesDa(retorno).find((c) => c.startsWith('sessao='))?.split(';')[0] };
}

test('entrar manda ao GitHub com client_id, redirect_uri e um state aleatório guardado em cookie', async (t) => {
  const api = await subir({ configDoLogin: CONFIG, buscarNoGitHub: provedor().buscar });
  t.after(api.fechar);
  const { entrada, destino } = await entrar(api);
  assert.equal(entrada.status, 302);
  assert.equal(destino.origin + destino.pathname, 'https://github.com/login/oauth/authorize');
  assert.equal(destino.searchParams.get('client_id'), 'id-ficticio');
  assert.equal(destino.searchParams.get('redirect_uri'), CONFIG.urlDeRetorno);
  assert.match(destino.searchParams.get('state'), /^[\w-]{32}$/);
  const cookie = cookiesDa(entrada)[0];
  assert.match(cookie, /^oauth_state=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  // Dois logins, dois states diferentes.
  const outro = await entrar(api);
  assert.notEqual(outro.destino.searchParams.get('state'), destino.searchParams.get('state'));
});

test('retorno com state certo cria a sessão em cookie HttpOnly, Secure e SameSite, e volta ao painel', async (t) => {
  const { buscar, pedidos } = provedor();
  const api = await subir({ configDoLogin: CONFIG, buscarNoGitHub: buscar });
  t.after(api.fechar);
  const { retorno, sessao } = await entrar(api);
  assert.equal(retorno.status, 302);
  assert.equal(retorno.headers.get('location'), CONFIG.urlDoPainel);
  const cookie = cookiesDa(retorno).find((c) => c.startsWith('sessao='));
  for (const atributo of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/v1']) assert.ok(cookie.includes(atributo), `${atributo} em ${cookie}`);
  const eu = await fetch(`${api.base}/v1/auth/eu`, { headers: { Cookie: sessao } });
  assert.deepEqual(await eu.json(), { usuario: 'pessoa-mantenedora', papel: 'mantenedor' });
  assert.equal(eu.headers.get('cache-control'), 'no-store');
  // O segredo vai só na troca do code, nunca para o navegador.
  assert.equal(pedidos.length, 2);
  assert.doesNotMatch(JSON.stringify(cookiesDa(retorno)), /segredo-ficticio|token-ficticio/);
});

test('CSRF: retorno com state diferente do cookie, ou sem o cookie, é recusado (403) e não cria sessão', async (t) => {
  const api = await subir({ configDoLogin: CONFIG, buscarNoGitHub: provedor().buscar });
  t.after(api.fechar);
  const entrada = await fetch(`${api.base}/v1/auth/entrar`, semSeguir);
  const cookieDoState = cookiesDa(entrada)[0].split(';')[0];
  const trocado = await fetch(`${api.base}/v1/auth/retorno?code=bom&state=outro-state`, { ...semSeguir, headers: { Cookie: cookieDoState } });
  assert.equal(trocado.status, 403);
  const state = new URL(entrada.headers.get('location')).searchParams.get('state');
  const semCookie = await fetch(`${api.base}/v1/auth/retorno?code=bom&state=${state}`, semSeguir);
  assert.equal(semCookie.status, 403);
  assert.equal(api.app.locals.sessoes.tamanho, 0);
});

test('code recusado pelo GitHub não cria sessão', async (t) => {
  const api = await subir({ configDoLogin: CONFIG, buscarNoGitHub: provedor().buscar });
  t.after(api.fechar);
  const { retorno, sessao } = await entrar(api, { code: 'ruim' });
  assert.equal(retorno.status, 403);
  assert.equal(sessao, undefined);
});

test('sair encerra a sessão no servidor: o cookie antigo deixa de valer', async (t) => {
  const api = await subir({ configDoLogin: CONFIG, buscarNoGitHub: provedor().buscar });
  t.after(api.fechar);
  const { sessao } = await entrar(api);
  const sair = await fetch(`${api.base}/v1/auth/sair`, { method: 'POST', headers: { Cookie: sessao } });
  assert.equal(sair.status, 204);
  assert.match(cookiesDa(sair).join(), /sessao=;/);
  assert.equal(api.app.locals.sessoes.tamanho, 0);
  // Mesmo quem guardou o cookie não entra mais.
  assert.equal((await fetch(`${api.base}/v1/auth/eu`, { headers: { Cookie: sessao } })).status, 401);
});

test('a sessão expira depois de 8 horas', () => {
  let agora = 0;
  const sessoes = criarSessoes({ agora: () => agora });
  const id = sessoes.criar('pessoa-a', 'pessoa');
  agora = 8 * 3_600_000 - 1;
  assert.deepEqual(sessoes.ler(id), { usuario: 'pessoa-a', papel: 'pessoa' });
  agora = 8 * 3_600_000;
  assert.equal(sessoes.ler(id), null);
});

test('sem GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET o login responde 503 e o resto da API funciona', async (t) => {
  const api = await subir({ configDoLogin: { ...CONFIG, clienteId: undefined, segredo: undefined } });
  t.after(api.fechar);
  const r = await fetch(`${api.base}/v1/auth/entrar`, semSeguir);
  assert.equal(r.status, 503);
  assert.match((await r.json()).detail, /GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET/);
  assert.equal((await fetch(`${api.base}/v1/health`)).status, 200);
});

test('os segredos vêm só de variáveis de ambiente, com os nomes no .env.example', () => {
  const exemplo = readFileSync(new URL('../.env.example', import.meta.url), 'utf8');
  for (const nome of ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'URL_DE_RETORNO', 'URL_DO_PAINEL', 'MANTENEDORES']) {
    assert.match(exemplo, new RegExp(`^${nome}=$`, 'm'), `${nome} sem valor no .env.example`);
  }
  const config = configDoAmbiente({ GITHUB_CLIENT_ID: 'a', GITHUB_CLIENT_SECRET: 'b', MANTENEDORES: 'Pessoa-A, pessoa-b' });
  assert.equal(config.clienteId, 'a');
  assert.deepEqual(config.mantenedores, ['pessoa-a', 'pessoa-b']);
});

// T5.14

const CONCLUSAO = { item: 'T1.2', usuario: 'pessoa-ficticia', pr: 'https://github.com/exemplo/repo/pull/3' };
const registrar = (api, cookie) =>
  fetch(`${api.base}/v1/conclusoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) },
    body: JSON.stringify(CONCLUSAO),
  });

test('T5.14: sem sessão, a rota protegida responde 401', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const r = await registrar(api);
  assert.equal(r.status, 401);
  assert.equal((await r.json()).title, 'Sessão necessária');
  assert.deepEqual(await api.repositorio.listarConclusoes(), []);
});

test('T5.14: com sessão de "pessoa", 403', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const r = await registrar(api, api.cookieDe('pessoa-comum', 'pessoa'));
  assert.equal(r.status, 403);
  assert.equal((await r.json()).detail, 'Só quem tem o papel "mantenedor" pode fazer isso.');
  assert.deepEqual(await api.repositorio.listarConclusoes(), []);
});

test('T5.14: com sessão de "mantenedor", 201', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  assert.equal((await registrar(api, api.cookieDe())).status, 201);
});

test('T5.14: o papel vem do servidor (lista MANTENEDORES), nunca do pedido', async (t) => {
  assert.equal(papelDe('Pessoa-Mantenedora', ['pessoa-mantenedora']), 'mantenedor');
  assert.equal(papelDe('outra', ['pessoa-mantenedora']), 'pessoa');
  const api = await subir({ configDoLogin: CONFIG, buscarNoGitHub: provedor('pessoa-comum').buscar });
  t.after(api.fechar);
  const { sessao } = await entrar(api);
  // Um cookie forjado ou um campo "papel" no corpo não dão permissão.
  assert.equal((await registrar(api, sessao)).status, 403);
  assert.equal((await registrar(api, 'sessao=inventada')).status, 401);
  assert.deepEqual(lerCookies('a=1; sessao=x%3Dy'), { a: '1', sessao: 'x=y' });
});
