// T5.1 e T5.6: rotas /v1/health e /v1/catalogo, só com o repositório em memória.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarApp } from '../src/app.mjs';
import { leitorDeArquivo } from '../src/catalogo.mjs';
import { conclusao, subir } from './apoio.mjs';

test('/v1/health lê o repositório e responde 200', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  await api.repositorio.registrarConclusao(conclusao('T1.1', 'pessoa-ficticia'));
  const resposta = await fetch(`${api.base}/v1/health`);
  assert.equal(resposta.status, 200);
  assert.deepEqual(await resposta.json(), { situacao: 'ok', repositorio: { situacao: 'ok', conclusoes: 1 } });
});

test('/v1/health responde 503 quando o repositório falha', async (t) => {
  const quebrado = {
    saude: async () => {
      throw new Error('sem banco');
    },
    registrarConclusao: async () => ({}),
    listarConclusoes: async () => [],
  };
  const api = await subir({ repositorio: quebrado });
  t.after(api.fechar);
  const resposta = await fetch(`${api.base}/v1/health`);
  assert.equal(resposta.status, 503);
  assert.equal((await resposta.json()).repositorio.situacao, 'falha');
});

test('/v1/catalogo devolve trilhas e itens lidos do catálogo', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const resposta = await fetch(`${api.base}/v1/catalogo`);
  assert.equal(resposta.status, 200);
  assert.match(resposta.headers.get('content-type'), /application\/json/);
  const { trilhas } = await resposta.json();
  assert.deepEqual(
    trilhas.map((t) => [t.codigo, t.nome, t.itens.length]),
    [
      ['T1', 'Trilha um', 2],
      ['T2', 'Trilha dois', 2],
    ],
  );
  assert.deepEqual(trilhas[0].itens[1], { codigo: 'T1.2', texto: 'Segundo item, com `código`.', feito: false, issue: 12, conclusoes: [] });
});

test('/v1/catalogo mostra quem fez cada item e conta o item como feito', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  await api.repositorio.registrarConclusao(conclusao('T2.1', 'pessoa-ficticia', 7));
  const { trilhas } = await (await fetch(`${api.base}/v1/catalogo`)).json();
  assert.deepEqual(trilhas[1].itens[0], {
    codigo: 'T2.1',
    texto: 'Terceiro item.',
    feito: true,
    conclusoes: [{ usuario: 'pessoa-ficticia', pr: 'https://github.com/exemplo/repo/pull/7' }],
  });
});

test('o helmet manda os cabeçalhos de segurança e esconde o X-Powered-By', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const resposta = await fetch(`${api.base}/v1/health`);
  assert.equal(resposta.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(resposta.headers.get('content-security-policy'));
  assert.equal(resposta.headers.get('x-powered-by'), null);
});

test('o CORS só aceita a origem configurada', async (t) => {
  const api = await subir({ origens: ['http://127.0.0.1:4317'] });
  t.after(api.fechar);
  const aceita = await fetch(`${api.base}/v1/catalogo`, { headers: { Origin: 'http://127.0.0.1:4317' } });
  assert.equal(aceita.headers.get('access-control-allow-origin'), 'http://127.0.0.1:4317');
  const outra = await fetch(`${api.base}/v1/catalogo`, { headers: { Origin: 'https://outro.exemplo' } });
  assert.equal(outra.headers.get('access-control-allow-origin'), null);
});

test('criarApp recusa um repositório fora da interface', () => {
  assert.throws(() => criarApp({ repositorio: { saude: async () => ({}) } }), /registrarConclusao, listarConclusoes/);
});

test('/v1/catalogo lê o CATALOGO.md da raiz sem erro', async (t) => {
  const api = await subir({ lerCatalogo: leitorDeArquivo() });
  t.after(api.fechar);
  const { trilhas } = await (await fetch(`${api.base}/v1/catalogo`)).json();
  assert.ok(trilhas.length >= 12);
  assert.ok(trilhas.flatMap((t) => t.itens).length >= 161);
});
