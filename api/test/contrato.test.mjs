// T7.8: teste de contrato. Cada rota é chamada de verdade (repositório em memória,
// sem banco) e a resposta, de sucesso ou de erro, é validada contra o openapi.json.
// Se o código mudar uma resposta sem mudar a especificação, este teste falha no CI.
import { after, before, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { criarApp } from '../src/app.mjs';
import { criarRepositorioEmMemoria } from '../src/repositorios/memoria.mjs';
import { LOG_MUDO, conclusao, subir } from './apoio.mjs';
import { pedirComContrato, problemasDoContrato } from './contrato.mjs';

const JSON_ = { 'Content-Type': 'application/json' };
const post = (corpo) => ({ method: 'POST', headers: JSON_, body: typeof corpo === 'string' ? corpo : JSON.stringify(corpo) });
const VALIDA = { item: 'T1.2', usuario: 'pessoa-ficticia', pr: 'https://github.com/exemplo/repo/pull/3' };

// [nome, caminho, opções, status esperado]
const CASOS = [
  ['health', '/v1/health', {}, 200],
  ['catálogo', '/v1/catalogo', {}, 200],
  ['catálogo antigo em markdown', '/v1/catalogo.md', {}, 200],
  ['itens com filtro e paginação', '/v1/itens?trilha=T1&limite=1', {}, 200],
  ['um item', '/v1/itens/T2.1', {}, 200],
  ['erro: filtro inválido', '/v1/itens?situacao=quase', {}, 400],
  ['erro: item que não existe', '/v1/itens/T9.9', {}, 404],
  ['conclusão nova', '/v1/conclusoes', post(VALIDA), 201],
  ['conclusão repetida', '/v1/conclusoes', post(VALIDA), 200],
  ['erro: entrada inválida', '/v1/conclusoes', post({ item: 'x' }), 400],
  ['erro: JSON malformado', '/v1/conclusoes', post('{'), 400],
  ['erro: item inexistente', '/v1/conclusoes', post({ ...VALIDA, item: 'T9.9' }), 404],
  ['erro: corpo grande', '/v1/conclusoes', post({ item: 'x'.repeat(11_000) }), 413],
  ['sincronizar com o GitHub', '/v1/sincronizar', { method: 'POST' }, 200],
  ['progresso em CSV', '/v1/progresso.csv', {}, 200],
  ['erro: login sem configuração', '/v1/auth/entrar', {}, 503],
  ['erro: retorno do login sem configuração', '/v1/auth/retorno?code=x&state=y', {}, 503],
  ['sair', '/v1/auth/sair', { method: 'POST' }, 204],
  ['erro: quem sou eu sem sessão', '/v1/auth/eu', {}, 401],
  ['progresso por trilha', '/v1/progresso/trilhas', {}, 200],
  ['progresso por pessoa', '/v1/progresso/pessoas', {}, 200],
  ['concluintes de uma trilha', '/v1/trilhas/T1/concluintes', {}, 200],
  ['erro: concluintes de trilha que não existe', '/v1/trilhas/T9/concluintes', {}, 404],
];

const PR_FICTICIO = { base: { ref: 'main' }, title: 'T1.1: primeiro', user: { login: 'pessoa-b' }, html_url: 'https://github.com/exemplo/repo/pull/8', merged_at: '2026-11-10T15:00:00Z' };

describe('contrato da API contra o openapi.json', () => {
  let api;
  const cobertas = new Set();
  before(async () => {
    api = await subir({ github: { prsMesclados: async () => [PR_FICTICIO] } });
    await api.repositorio.registrarConclusao(conclusao('T2.1', 'pessoa-ficticia', 7));
  });
  after(() => api.fechar());

  for (const [nome, caminho, opcoes, status] of CASOS) {
    test(`${nome}: ${opcoes.method ?? 'GET'} ${caminho} → ${status}`, async () => {
      const comSessao = caminho === '/v1/conclusoes' ? { ...opcoes, headers: { ...opcoes.headers, Cookie: api.cookieDe() } } : opcoes;
      const r = await pedirComContrato(api.base, caminho, comSessao);
      assert.equal(r.status, status);
      assert.deepEqual(r.problemas, []);
      cobertas.add(r.operacao);
    });
  }

  test('erro 500 e 503 também seguem o contrato', async (t) => {
    const falho = await subir({
      lerCatalogo: async () => {
        throw new Error('falha');
      },
      repositorio: { ...criarRepositorioEmMemoria(), saude: async () => Promise.reject(new Error('sem banco')) },
      log: LOG_MUDO,
    });
    t.after(falho.fechar);
    const quinhentos = await pedirComContrato(falho.base, '/v1/catalogo');
    assert.equal(quinhentos.status, 500);
    assert.deepEqual(quinhentos.problemas, []);
    const indisponivel = await pedirComContrato(falho.base, '/v1/health');
    assert.equal(indisponivel.status, 503);
    assert.deepEqual(indisponivel.problemas, []);
  });

  test('login (302), quem sou eu (200) e 401 e 403 da rota protegida seguem o contrato', async (t) => {
    const buscar = async (url) =>
      url.includes('access_token') ? Response.json({ access_token: 'token-ficticio' }) : Response.json({ login: 'pessoa-comum' });
    const config = { clienteId: 'id', segredo: 'segredo', urlDeRetorno: 'http://x/v1/auth/retorno', urlDoPainel: 'http://x/', mantenedores: [] };
    const login = await subir({ configDoLogin: config, buscarNoGitHub: buscar });
    t.after(login.fechar);
    const entrada = await pedirComContrato(login.base, '/v1/auth/entrar', { redirect: 'manual' });
    assert.equal(entrada.status, 302);
    assert.deepEqual(entrada.problemas, []);
    const state = new URL(entrada.cabecalhos.get('location')).searchParams.get('state');
    const cookie = entrada.cabecalhos.getSetCookie()[0].split(';')[0];
    const retorno = await pedirComContrato(login.base, `/v1/auth/retorno?code=c&state=${state}`, { redirect: 'manual', headers: { Cookie: cookie } });
    assert.equal(retorno.status, 302);
    assert.deepEqual(retorno.problemas, []);
    const sessao = retorno.cabecalhos.getSetCookie().find((c) => c.startsWith('sessao=')).split(';')[0];
    const eu = await pedirComContrato(login.base, '/v1/auth/eu', { headers: { Cookie: sessao } });
    assert.equal(eu.status, 200);
    assert.deepEqual(eu.problemas, []);
    const corpo = JSON.stringify(VALIDA);
    const semSessao = await pedirComContrato(login.base, '/v1/conclusoes', { method: 'POST', headers: JSON_, body: corpo });
    assert.equal(semSessao.status, 401);
    assert.deepEqual(semSessao.problemas, []);
    const semPapel = await pedirComContrato(login.base, '/v1/conclusoes', { method: 'POST', headers: { ...JSON_, Cookie: sessao }, body: corpo });
    assert.equal(semPapel.status, 403);
    assert.deepEqual(semPapel.problemas, []);
  });

  test('429, 502 e 503 também seguem o contrato', async (t) => {
    const { ErroDaApi } = await import('../src/erros.mjs');
    const falhas = [new ErroDaApi('falha-do-github', 'x'), new ErroDaApi('github-indisponivel', 'y', { cabecalhos: { 'Retry-After': '9' } })];
    const outra = await subir({ limitePorMinuto: 2, github: { prsMesclados: async () => Promise.reject(falhas.shift()) } });
    t.after(outra.fechar);
    assert.deepEqual((await pedirComContrato(outra.base, '/v1/sincronizar', { method: 'POST' })).problemas, []);
    const indisponivel = await pedirComContrato(outra.base, '/v1/sincronizar', { method: 'POST' });
    assert.equal(indisponivel.status, 503);
    assert.deepEqual(indisponivel.problemas, []);
    const limite = await pedirComContrato(outra.base, '/v1/catalogo');
    assert.equal(limite.status, 429);
    assert.deepEqual(limite.problemas, []);
  });

  test('eventos (SSE): status e tipo de conteúdo seguem o contrato', async () => {
    // A conexão não termina: lê só o cabeçalho e fecha.
    const controle = new AbortController();
    const r = await fetch(`${api.base}/v1/eventos`, { signal: controle.signal });
    const problemas = problemasDoContrato({ metodo: 'GET', caminho: '/v1/eventos', status: r.status, tipo: r.headers.get('content-type'), corpo: '' });
    controle.abort();
    assert.equal(r.status, 200);
    assert.deepEqual(problemas, []);
    cobertas.add('get /v1/eventos');
  });

  test('toda rota do app foi chamada por algum caso acima', () => {
    const rotas = criarApp({ repositorio: criarRepositorioEmMemoria() }).locals.rotas.map(
      (r) => `${r.metodo} ${r.caminho.replace(/:(\w+)/g, '{$1}')}`,
    );
    assert.deepEqual([...cobertas].sort(), [...new Set(rotas)].sort());
  });
});

describe('o validador pega uma quebra de contrato', () => {
  const certa = { trilhas: [{ codigo: 'T1', nome: 'Um', roadmaps: [{ nome: 'Git', url: 'https://roadmap.sh/git-github' }], itens: [{ codigo: 'T1.1', texto: 'x', feito: true, conclusoes: [] }] }] };
  const catalogo = (corpo) => problemasDoContrato({ metodo: 'GET', caminho: '/v1/catalogo', status: 200, tipo: 'application/json', corpo });

  test('a resposta certa passa', () => {
    assert.deepEqual(catalogo(certa), []);
  });

  test('campo obrigatório que some', () => {
    const { feito: _feito, ...semFeito } = certa.trilhas[0].itens[0];
    assert.match(catalogo({ trilhas: [{ ...certa.trilhas[0], itens: [semFeito] }] }).join(), /must have required property 'feito'/);
  });

  test('campo que muda de tipo', () => {
    const errada = structuredClone(certa);
    errada.trilhas[0].itens[0].feito = 'sim';
    assert.match(catalogo(errada).join(), /\/trilhas\/0\/itens\/0\/feito must be boolean/);
  });

  test('campo novo que a especificação não conhece', () => {
    const errada = structuredClone(certa);
    errada.trilhas[0].extra = 1;
    assert.match(catalogo(errada).join(), /must NOT have additional properties/);
  });

  test('status que a especificação não declara', () => {
    assert.match(problemasDoContrato({ metodo: 'GET', caminho: '/v1/catalogo', status: 418, tipo: 'application/json', corpo: {} }).join(), /não declara a resposta 418/);
  });

  test('erro sem os campos do Problem Details', () => {
    const r = problemasDoContrato({ metodo: 'POST', caminho: '/v1/conclusoes', status: 400, tipo: 'application/problem+json', corpo: { mensagem: 'erro' } });
    assert.match(r.join(), /required property 'type'/);
  });

  test('erro com o tipo de conteúdo errado', () => {
    const r = problemasDoContrato({ metodo: 'POST', caminho: '/v1/conclusoes', status: 400, tipo: 'application/json', corpo: {} });
    assert.match(r.join(), /tipo application\/json fora da especificação/);
  });
});

test('contrato: 304 com If-None-Match nas rotas de leitura', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  for (const caminho of ['/v1/catalogo', '/v1/itens', '/v1/itens/T1.1']) {
    const etag = (await fetch(`${api.base}${caminho}`)).headers.get('etag');
    const r = await pedirComContrato(api.base, caminho, { headers: { 'If-None-Match': etag } });
    assert.equal(r.status, 304);
    assert.deepEqual(r.problemas, []);
  }
});
