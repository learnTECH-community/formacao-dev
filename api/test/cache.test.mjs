// T5.7: cache do catálogo com tempo de vida, ETag, Cache-Control e 304.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPO_PADRAO_EM_SEGUNDOS, casaComEtag, emCache, tempoDoCache } from '../src/cache.mjs';
import { CATALOGO_DE_TESTE, conclusao, subir } from './apoio.mjs';

/** Relógio que o teste avança, e um leitor que conta quantas vezes o arquivo foi lido. */
function preparar() {
  let agora = Date.parse('2026-11-10T12:00:00Z');
  const leituras = { total: 0 };
  let texto = CATALOGO_DE_TESTE;
  return {
    relogio: () => new Date(agora),
    avancar: (segundos) => {
      agora += segundos * 1000;
    },
    leituras,
    trocarTexto: (novo) => {
      texto = novo;
    },
    lerCatalogo: async () => {
      leituras.total++;
      return texto;
    },
  };
}

test('cache válido: dentro do tempo de vida o catálogo é lido uma vez só', async (t) => {
  const p = preparar();
  const api = await subir({ relogio: p.relogio, lerCatalogo: p.lerCatalogo, segundosDoCache: 30 });
  t.after(api.fechar);
  for (let i = 0; i < 5; i++) assert.equal((await fetch(`${api.base}/v1/catalogo`)).status, 200);
  await fetch(`${api.base}/v1/itens`);
  p.avancar(29);
  await fetch(`${api.base}/v1/catalogo`);
  assert.equal(p.leituras.total, 1);
});

test('cache expirado: depois do tempo de vida o catálogo é lido de novo e a mudança aparece', async (t) => {
  const p = preparar();
  const api = await subir({ relogio: p.relogio, lerCatalogo: p.lerCatalogo, segundosDoCache: 30 });
  t.after(api.fechar);
  const antes = await (await fetch(`${api.base}/v1/catalogo`)).json();
  p.trocarTexto(CATALOGO_DE_TESTE.replace('- [ ] **T2.2**', '- [x] **T2.2**'));
  // Ainda no tempo de vida: a resposta é a antiga.
  p.avancar(10);
  assert.deepEqual(await (await fetch(`${api.base}/v1/catalogo`)).json(), antes);
  p.avancar(21);
  const depois = await (await fetch(`${api.base}/v1/catalogo`)).json();
  assert.equal(depois.trilhas[1].itens[1].feito, true);
  assert.equal(p.leituras.total, 2);
});

test('pedidos simultâneos com o cache vazio fazem uma leitura só', async () => {
  let leituras = 0;
  const obter = emCache(
    async () => {
      leituras++;
      await new Promise((r) => setTimeout(r, 10));
      return 'texto';
    },
    { segundos: 60 },
  );
  assert.deepEqual(await Promise.all([obter(), obter(), obter()]), ['texto', 'texto', 'texto']);
  assert.equal(leituras, 1);
});

test('a resposta leva ETag forte e Cache-Control', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  for (const rota of ['/v1/catalogo', '/v1/itens', '/v1/itens/T1.1']) {
    const resposta = await fetch(`${api.base}${rota}`);
    assert.match(resposta.headers.get('etag'), /^"[\w-]{27}"$/, rota);
    assert.equal(resposta.headers.get('cache-control'), 'no-cache', rota);
  }
});

test('If-None-Match igual recebe 304 sem corpo; diferente recebe 200', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const primeira = await fetch(`${api.base}/v1/catalogo`);
  const etag = primeira.headers.get('etag');
  const igual = await fetch(`${api.base}/v1/catalogo`, { headers: { 'If-None-Match': etag } });
  assert.equal(igual.status, 304);
  assert.equal(await igual.text(), '');
  assert.equal(igual.headers.get('etag'), etag);
  const outra = await fetch(`${api.base}/v1/catalogo`, { headers: { 'If-None-Match': '"outra-versao"' } });
  assert.equal(outra.status, 200);
});

test('uma conclusão nova muda o ETag, e o ETag antigo volta a receber 200', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const etag = (await fetch(`${api.base}/v1/catalogo`)).headers.get('etag');
  await api.repositorio.registrarConclusao(conclusao('T2.1', 'pessoa-ficticia'));
  const depois = await fetch(`${api.base}/v1/catalogo`, { headers: { 'If-None-Match': etag } });
  assert.equal(depois.status, 200);
  assert.notEqual(depois.headers.get('etag'), etag);
});

test('If-None-Match com lista, com W/ e com *', () => {
  assert.equal(casaComEtag('"a", "b"', '"b"'), true);
  assert.equal(casaComEtag('W/"b"', '"b"'), true);
  assert.equal(casaComEtag('*', '"b"'), true);
  assert.equal(casaComEtag('"a"', '"b"'), false);
  assert.equal(casaComEtag(undefined, '"b"'), false);
});

test('o tempo de vida vem da variável TEMPO_DO_CACHE_EM_SEGUNDOS', () => {
  assert.equal(tempoDoCache('5'), 5);
  assert.equal(tempoDoCache('0'), 0);
  assert.equal(tempoDoCache(undefined), TEMPO_PADRAO_EM_SEGUNDOS);
  assert.equal(tempoDoCache('muito'), TEMPO_PADRAO_EM_SEGUNDOS);
  assert.equal(tempoDoCache('-1'), TEMPO_PADRAO_EM_SEGUNDOS);
});
