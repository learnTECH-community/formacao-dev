// T5.8: avisos em tempo real com SSE.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ESPERA_PARA_RECONECTAR_MS } from '../src/eventos.mjs';
import { subir } from './apoio.mjs';

/** Abre /v1/eventos e devolve um leitor de blocos SSE ("evento" separados por linha em branco). */
async function ouvir(base) {
  const controle = new AbortController();
  const resposta = await fetch(`${base}/v1/eventos`, { signal: controle.signal });
  const leitor = resposta.body.pipeThrough(new TextDecoderStream()).getReader();
  let resto = '';
  return {
    resposta,
    async proximo() {
      while (!resto.includes('\n\n')) {
        const { value, done } = await leitor.read();
        if (done) throw new Error('a conexão fechou');
        resto += value;
      }
      const i = resto.indexOf('\n\n');
      const bloco = resto.slice(0, i);
      resto = resto.slice(i + 2);
      return bloco;
    },
    fechar: () => controle.abort(),
  };
}

const POST = (api, item) =>
  fetch(`${api.base}/v1/conclusoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: api.cookieDe() },
    body: JSON.stringify({ item, usuario: 'pessoa-ficticia', pr: 'https://github.com/exemplo/repo/pull/1' }),
  });

test('a rota responde text/event-stream, sem cache, e diz quanto esperar para reconectar', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const ouvinte = await ouvir(api.base);
  t.after(ouvinte.fechar);
  assert.equal(ouvinte.resposta.status, 200);
  assert.equal(ouvinte.resposta.headers.get('content-type'), 'text/event-stream; charset=utf-8');
  assert.match(ouvinte.resposta.headers.get('cache-control'), /no-cache/);
  assert.equal(await ouvinte.proximo(), `retry: ${ESPERA_PARA_RECONECTAR_MS}\n: conectado`);
});

test('uma conclusão nova chega a todos os painéis abertos', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const a = await ouvir(api.base);
  const b = await ouvir(api.base);
  t.after(() => {
    a.fechar();
    b.fechar();
  });
  await a.proximo();
  await b.proximo();
  assert.equal(api.app.locals.eventos.ouvintes, 2);
  assert.equal((await POST(api, 'T1.2')).status, 201);
  const esperado = 'id: 1\nevent: conclusao\ndata: {"motivo":"conclusao","itens":["T1.2"]}';
  assert.equal(await a.proximo(), esperado);
  assert.equal(await b.proximo(), esperado);
});

test('a conclusão repetida não gera aviso', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const ouvinte = await ouvir(api.base);
  t.after(ouvinte.fechar);
  await ouvinte.proximo();
  await POST(api, 'T1.2');
  assert.equal(await ouvinte.proximo(), 'id: 1\nevent: conclusao\ndata: {"motivo":"conclusao","itens":["T1.2"]}');
  assert.equal((await POST(api, 'T1.2')).status, 200);
  await POST(api, 'T2.1');
  // O próximo aviso já é o da T2.1: a repetida não mandou nada.
  assert.match(await ouvinte.proximo(), /^id: 2\nevent: conclusao\ndata: .*"T2.1"/);
});

test('a sincronização com conclusões novas também avisa', async (t) => {
  const pr = { base: { ref: 'main' }, title: 'T2.2: quarto', user: { login: 'pessoa-b' }, html_url: 'https://github.com/exemplo/repo/pull/9', merged_at: '2026-11-10T15:00:00Z' };
  const api = await subir({ github: { prsMesclados: async () => [pr] } });
  t.after(api.fechar);
  const ouvinte = await ouvir(api.base);
  t.after(ouvinte.fechar);
  await ouvinte.proximo();
  assert.deepEqual(await (await fetch(`${api.base}/v1/sincronizar`, { method: 'POST' })).json(), { lidas: 1, novas: 1, repetidas: 0 });
  assert.match(await ouvinte.proximo(), /data: \{"motivo":"sincronizacao","itens":\["T2.2"\]\}/);
});

test('quem fecha a conexão sai da lista de ouvintes', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const ouvinte = await ouvir(api.base);
  await ouvinte.proximo();
  assert.equal(api.app.locals.eventos.ouvintes, 1);
  ouvinte.fechar();
  for (let i = 0; i < 50 && api.app.locals.eventos.ouvintes > 0; i++) await new Promise((r) => setTimeout(r, 10));
  assert.equal(api.app.locals.eventos.ouvintes, 0);
});
