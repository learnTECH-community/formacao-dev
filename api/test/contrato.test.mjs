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
];

describe('contrato da API contra o openapi.json', () => {
  let api;
  const cobertas = new Set();
  before(async () => {
    api = await subir();
    await api.repositorio.registrarConclusao(conclusao('T2.1', 'pessoa-ficticia', 7));
  });
  after(() => api.fechar());

  for (const [nome, caminho, opcoes, status] of CASOS) {
    test(`${nome}: ${opcoes.method ?? 'GET'} ${caminho} → ${status}`, async () => {
      const r = await pedirComContrato(api.base, caminho, opcoes);
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

  test('toda rota do app foi chamada por algum caso acima', () => {
    const rotas = criarApp({ repositorio: criarRepositorioEmMemoria() }).locals.rotas.map(
      (r) => `${r.metodo} ${r.caminho.replace(/:(\w+)/g, '{$1}')}`,
    );
    assert.deepEqual([...cobertas].sort(), [...new Set(rotas)].sort());
  });
});

describe('o validador pega uma quebra de contrato', () => {
  const certa = { trilhas: [{ codigo: 'T1', nome: 'Um', itens: [{ codigo: 'T1.1', texto: 'x', feito: true, conclusoes: [] }] }] };
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
