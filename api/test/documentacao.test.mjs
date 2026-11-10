// T5.3: a especificação e o docs/api.md cobrem toda rota do app.
// T5.15: rotas sob /v1, aviso de rota antiga e prazo de desativação.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { criarApp } from '../src/app.mjs';
import { PROBLEMAS } from '../src/erros.mjs';
import { criarRepositorioEmMemoria } from '../src/repositorios/memoria.mjs';
import { OBSOLETAS, prazoCumprido } from '../src/versao.mjs';
import { subir } from './apoio.mjs';

const especificacao = JSON.parse(readFileSync(new URL('../openapi.json', import.meta.url), 'utf8'));
const doc = readFileSync(new URL('../../docs/api.md', import.meta.url), 'utf8');
const changelog = readFileSync(new URL('../CHANGELOG.md', import.meta.url), 'utf8');
const rotas = criarApp({ repositorio: criarRepositorioEmMemoria() }).locals.rotas;
// "/v1/itens/:codigo" no Express é "/v1/itens/{codigo}" no OpenAPI.
const noOpenApi = (caminho) => caminho.replace(/:(\w+)/g, '{$1}');

test('a especificação é OpenAPI 3.1', () => {
  assert.match(especificacao.openapi, /^3\.1\./);
});

test('toda rota do app está na especificação, e a especificação não tem rota a mais', () => {
  const doApp = rotas.map((r) => `${r.metodo} ${noOpenApi(r.caminho)}`).sort();
  const daEspecificacao = Object.entries(especificacao.paths)
    .flatMap(([caminho, metodos]) => Object.keys(metodos).map((m) => `${m} ${caminho}`))
    .sort();
  assert.deepEqual(daEspecificacao, doApp);
});

test('toda rota do app tem seção com exemplo de curl no docs/api.md', () => {
  for (const { metodo, caminho } of rotas) {
    const titulo = `### ${metodo.toUpperCase()} ${noOpenApi(caminho)}`;
    const inicio = doc.indexOf(titulo);
    assert.ok(inicio >= 0, `falta "${titulo}"`);
    const secao = doc.slice(inicio, doc.indexOf('\n### ', inicio + 1));
    assert.match(secao, /curl /, `"${titulo}" sem exemplo de curl`);
  }
});

test('todo tipo de erro tem explicação no docs/api.md, que é o "type" do problema', () => {
  for (const tipo of Object.keys(PROBLEMAS)) assert.match(doc, new RegExp(`^#### ${tipo}$`, 'm'), `falta "#### ${tipo}"`);
});

test('T5.15: todas as rotas ficam sob /v1', () => {
  for (const { caminho } of rotas) assert.match(caminho, /^\/v1\//);
});

test('T5.15: rota antiga responde com Deprecation, Sunset e a substituta', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const resposta = await fetch(`${api.base}/v1/catalogo.md`);
  assert.equal(resposta.status, 200);
  assert.match(resposta.headers.get('content-type'), /text\/markdown/);
  assert.equal(resposta.headers.get('deprecation'), `@${Date.parse('2026-11-10T00:00:00Z') / 1000}`);
  assert.equal(resposta.headers.get('sunset'), 'Mon, 08 Feb 2027 00:00:00 GMT');
  assert.equal(resposta.headers.get('link'), '</v1/catalogo>; rel="successor-version"');
  assert.match(await resposta.text(), /^# Catálogo de formação/);
  // Rota atual não leva o aviso.
  assert.equal((await fetch(`${api.base}/v1/catalogo`)).headers.get('deprecation'), null);
});

test('T5.15: toda rota antiga cumpre o prazo de aviso e está marcada na especificação e no changelog', () => {
  for (const [caminho, dados] of Object.entries(OBSOLETAS)) {
    assert.ok(prazoCumprido(dados), `${caminho} sai antes de 90 dias`);
    assert.equal(especificacao.paths[caminho].get.deprecated, true);
    assert.ok(changelog.includes(caminho), `${caminho} fora do CHANGELOG`);
  }
});
