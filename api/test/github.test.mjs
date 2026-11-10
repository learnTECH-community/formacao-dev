// T5.4: quem fez cada item, lido dos PRs mesclados (GitHub simulado, nomes fictícios).
// T5.5: falha de rede, demora, 5xx e limite esgotado do GitHub.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codigosDoTitulo, conclusoesDosPrs, criarClienteDoGitHub } from '../src/github.mjs';
import { conclusao, subir } from './apoio.mjs';

const pr = (numero, titulo, usuario, mesclado = '2026-11-10T15:00:00Z', base = 'developer/sprint-2026-11-12') => ({
  base: { ref: base },
  number: numero,
  title: titulo,
  user: { login: usuario },
  html_url: `https://github.com/exemplo/repo/pull/${numero}`,
  merged_at: mesclado,
});

const PRS = [
  pr(1, 'T1.2: segundo item', 'pessoa-a'),
  pr(2, 'T2.1: terceiro item (e T2.2: quarto)', 'pessoa-b'),
  pr(3, 'T1.2: a mesma pessoa de novo', 'pessoa-a'),
  pr(4, 'docs: sem código de item', 'pessoa-c'),
  pr(5, 'T9.9: item que não existe', 'pessoa-c'),
  pr(6, 'T2.2: fechado sem merge', 'pessoa-d', null),
  pr(7, 'T2.2: mesclado noutra branch', 'pessoa-d', '2026-11-10T15:00:00Z', 'experimento'),
  pr(8, 'T2.2: direto na main', 'pessoa-e', '2026-11-10T16:00:00Z', 'main'),
];

/** GitHub simulado: devolve as respostas na ordem e guarda os pedidos. */
function githubSimulado(...respostas) {
  const pedidos = [];
  const buscar = async (url, opcoes) => {
    pedidos.push({ url, opcoes });
    const r = respostas.shift();
    if (r instanceof Error) throw r;
    if (typeof r === 'function') return r(opcoes);
    return r;
  };
  return { buscar, pedidos };
}

const json = (corpo, status = 200, cabecalhos = {}) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json', ...cabecalhos } });
const sincronizar = (base) => fetch(`${base}/v1/sincronizar`, { method: 'POST' });

test('o código do item sai do título, só quando seguido de dois-pontos', () => {
  assert.deepEqual(codigosDoTitulo('T5.1: API (e T5.6: repositório)'), ['T5.1', 'T5.6']);
  assert.deepEqual(codigosDoTitulo('Sprint T5.1 e T5.2'), []);
  assert.deepEqual(codigosDoTitulo('T2.3: a; T2.3: b'), ['T2.3']);
});

test('PRs mesclados na main ou numa sprint viram conclusões só dos itens que existem', () => {
  const existe = (c) => ['T1.2', 'T2.1', 'T2.2'].includes(c);
  assert.deepEqual(
    conclusoesDosPrs(PRS, existe).map((c) => `${c.item} ${c.usuario} ${c.pr.at(-1)}`),
    ['T1.2 pessoa-a 1', 'T2.1 pessoa-b 2', 'T2.2 pessoa-b 2', 'T1.2 pessoa-a 3', 'T2.2 pessoa-e 8'],
  );
});

test('POST /v1/sincronizar grava quem fez cada item, sem duplicar, e o catálogo mostra', async (t) => {
  const { buscar, pedidos } = githubSimulado(json(PRS), json(PRS));
  const api = await subir({ github: criarClienteDoGitHub({ fetch: buscar, repositorio: 'exemplo/repo' }) });
  t.after(api.fechar);
  const primeira = await sincronizar(api.base);
  assert.equal(primeira.status, 200);
  assert.deepEqual(await primeira.json(), { lidas: 5, novas: 4, repetidas: 1 });
  // Rodar de novo não duplica.
  assert.deepEqual(await (await sincronizar(api.base)).json(), { lidas: 5, novas: 0, repetidas: 5 });
  assert.equal((await api.repositorio.listarConclusoes()).length, 4);
  const { trilhas } = await (await fetch(`${api.base}/v1/catalogo`)).json();
  assert.deepEqual(trilhas[0].itens[1].conclusoes, [{ usuario: 'pessoa-a', pr: 'https://github.com/exemplo/repo/pull/1' }]);
  assert.equal(trilhas[1].itens[1].feito, true);
  assert.match(pedidos[0].url, /^https:\/\/api\.github\.com\/repos\/exemplo\/repo\/pulls\?state=closed&per_page=100&page=1$/);
});

test('lê todas as páginas de PRs', async () => {
  const cheia = Array.from({ length: 100 }, (_, i) => pr(i + 10, 'docs: x', 'pessoa-a'));
  const { buscar, pedidos } = githubSimulado(json(cheia), json([pr(1, 'T1.2: y', 'pessoa-a')]));
  const prs = await criarClienteDoGitHub({ fetch: buscar }).prsMesclados();
  assert.equal(prs.length, 101);
  assert.equal(pedidos.length, 2);
  assert.match(pedidos[1].url, /page=2$/);
});

test('o token, quando existe, vai só no cabeçalho Authorization', async () => {
  const { buscar, pedidos } = githubSimulado(json([]), json([]));
  await criarClienteDoGitHub({ fetch: buscar, token: 'token-ficticio' }).prsMesclados();
  assert.equal(pedidos[0].opcoes.headers.Authorization, 'Bearer token-ficticio');
  await criarClienteDoGitHub({ fetch: buscar }).prsMesclados();
  assert.equal(pedidos[1].opcoes.headers.Authorization, undefined);
});

const FALHAS = [
  ['falha de rede', new TypeError('fetch failed'), 502, /Não conseguimos falar com o GitHub/],
  ['erro 500 do GitHub', json({ message: 'erro' }, 500), 502, /HTTP 500/],
  ['erro 502 do GitHub', json({ message: 'erro' }, 502), 502, /HTTP 502/],
];

for (const [nome, resposta, status, mensagem] of FALHAS) {
  test(`${nome} vira ${status} claro, e as conclusões gravadas continuam disponíveis`, async (t) => {
    const { buscar } = githubSimulado(resposta);
    const api = await subir({ github: criarClienteDoGitHub({ fetch: buscar }) });
    t.after(api.fechar);
    await api.repositorio.registrarConclusao(conclusao('T1.1', 'pessoa-a'));
    const r = await sincronizar(api.base);
    assert.equal(r.status, status);
    const corpo = await r.json();
    assert.equal(corpo.title, 'Falha ao falar com o GitHub');
    assert.match(corpo.detail, mensagem);
    const { trilhas } = await (await fetch(`${api.base}/v1/catalogo`)).json();
    assert.equal(trilhas[0].itens[0].conclusoes.length, 1);
  });
}

test('GitHub que demora acima do tempo limite vira 502', async (t) => {
  const { buscar } = githubSimulado(
    (opcoes) =>
      new Promise((_, falhar) => {
        opcoes.signal.addEventListener('abort', () => falhar(opcoes.signal.reason));
      }),
  );
  const api = await subir({ github: criarClienteDoGitHub({ fetch: buscar, tempoLimiteMs: 50 }) });
  t.after(api.fechar);
  const r = await sincronizar(api.base);
  assert.equal(r.status, 502);
  assert.match((await r.json()).detail, /não respondeu em 0.05 s/);
});

test('limite do GitHub esgotado (403 com remaining 0) vira 503 com Retry-After', async (t) => {
  const agora = Date.parse('2026-11-10T12:00:00Z');
  const resposta = json({ message: 'API rate limit exceeded' }, 403, { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': String(agora / 1000 + 120) });
  const { buscar } = githubSimulado(resposta);
  const api = await subir({ github: criarClienteDoGitHub({ fetch: buscar, agora: () => agora }) });
  t.after(api.fechar);
  const r = await sincronizar(api.base);
  assert.equal(r.status, 503);
  assert.equal(r.headers.get('retry-after'), '120');
  assert.equal((await r.json()).title, 'GitHub indisponível por agora');
});

test('429 do GitHub com Retry-After vira 503 com o mesmo Retry-After', async (t) => {
  const { buscar } = githubSimulado(json({}, 429, { 'retry-after': '30' }));
  const api = await subir({ github: criarClienteDoGitHub({ fetch: buscar }) });
  t.after(api.fechar);
  const r = await sincronizar(api.base);
  assert.equal(r.status, 503);
  assert.equal(r.headers.get('retry-after'), '30');
});

test('403 sem limite esgotado (repositório privado, por exemplo) vira 502', async (t) => {
  const { buscar } = githubSimulado(json({ message: 'Forbidden' }, 403, { 'x-ratelimit-remaining': '42' }));
  const api = await subir({ github: criarClienteDoGitHub({ fetch: buscar }) });
  t.after(api.fechar);
  assert.equal((await sincronizar(api.base)).status, 502);
});
