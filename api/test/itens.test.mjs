// T5.12: GET /v1/itens com filtros e paginação, e GET /v1/itens/:codigo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LIMITE_MAXIMO } from '../src/rotas/itens.mjs';
import { conclusao, subir } from './apoio.mjs';

// Catálogo fictício grande: T1 com 45 itens (os pares feitos) e T2 com 10 a fazer.
function catalogoGrande() {
  const linhas = ['# Catálogo', '', '**Progresso:** 0 de 0 itens', '', '## T1 · Um'];
  for (let n = 1; n <= 45; n++) linhas.push(`- [${n % 2 === 0 ? 'x' : ' '}] **T1.${n}** Item ${n}.`);
  linhas.push('', '## T2 · Dois');
  for (let n = 1; n <= 10; n++) linhas.push(`- [ ] **T2.${n}** Item ${n}.`);
  return `${linhas.join('\n')}\n`;
}

async function pedir(base, caminho) {
  const r = await fetch(`${base}${caminho}`);
  return { status: r.status, link: r.headers.get('link'), corpo: await r.json() };
}

test('sem filtro: primeira página com 20 itens, o total e o link da próxima', async (t) => {
  const api = await subir({ lerCatalogo: async () => catalogoGrande() });
  t.after(api.fechar);
  const r = await pedir(api.base, '/v1/itens');
  assert.equal(r.status, 200);
  assert.equal(r.corpo.total, 55);
  assert.equal(r.corpo.itens.length, 20);
  assert.equal(r.corpo.pagina, 1);
  assert.equal(r.corpo.limite, 20);
  assert.equal(r.corpo.proxima, '/v1/itens?limite=20&pagina=2');
  assert.equal(r.link, '</v1/itens?limite=20&pagina=2>; rel="next"');
  assert.deepEqual(r.corpo.itens[0], { codigo: 'T1.1', texto: 'Item 1.', feito: false, conclusoes: [], trilha: 'T1' });
});

test('seguir "proxima" percorre todos os itens sem repetir, e a última página não tem próxima', async (t) => {
  const api = await subir({ lerCatalogo: async () => catalogoGrande() });
  t.after(api.fechar);
  const vistos = [];
  let caminho = '/v1/itens?limite=50';
  while (caminho) {
    const r = await pedir(api.base, caminho);
    vistos.push(...r.corpo.itens.map((i) => i.codigo));
    caminho = r.corpo.proxima;
    if (!caminho) assert.equal(r.link, null);
  }
  assert.equal(vistos.length, 55);
  assert.equal(new Set(vistos).size, 55);
});

test('filtros por trilha e situação, mantidos no link da próxima página', async (t) => {
  const api = await subir({ lerCatalogo: async () => catalogoGrande() });
  t.after(api.fechar);
  const feitos = await pedir(api.base, '/v1/itens?trilha=T1&situacao=feitos&limite=5');
  assert.equal(feitos.corpo.total, 22);
  assert.ok(feitos.corpo.itens.every((i) => i.trilha === 'T1' && i.feito));
  assert.equal(feitos.corpo.proxima, '/v1/itens?trilha=T1&situacao=feitos&limite=5&pagina=2');
  const aFazer = await pedir(api.base, '/v1/itens?trilha=T2&situacao=a-fazer');
  assert.equal(aFazer.corpo.total, 10);
  assert.equal(aFazer.corpo.proxima, null);
});

test('um item com conclusão registrada conta como feito no filtro', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  await api.repositorio.registrarConclusao(conclusao('T2.2', 'pessoa-ficticia', 5));
  const r = await pedir(api.base, '/v1/itens?trilha=T2&situacao=feitos');
  assert.deepEqual(
    r.corpo.itens.map((i) => i.codigo),
    ['T2.2'],
  );
});

const INVALIDOS = [
  ['trilha fora do formato', '/v1/itens?trilha=dois', 'trilha', 'trilha precisa estar no formato Tn, como T2.'],
  ['trilha que não existe', '/v1/itens?trilha=T99', 'trilha', 'A trilha T99 não existe.'],
  ['trilha repetida', '/v1/itens?trilha=T1&trilha=T2', 'trilha', 'trilha precisa ser um valor só, no formato Tn.'],
  ['situação desconhecida', '/v1/itens?situacao=quase', 'situacao', 'situacao precisa ser todos, feitos ou a-fazer.'],
  ['limite acima do máximo', `/v1/itens?limite=${LIMITE_MAXIMO + 1}`, 'limite', `limite pode ser no máximo ${LIMITE_MAXIMO}.`],
  ['limite zero', '/v1/itens?limite=0', 'limite', 'limite precisa ser no mínimo 1.'],
  ['página que não é número', '/v1/itens?pagina=dois', 'pagina', 'pagina precisa ser um número inteiro.'],
  ['filtro desconhecido', '/v1/itens?ordem=asc', '(corpo)', 'Filtro desconhecido: ordem.'],
];

for (const [nome, caminho, campo, mensagem] of INVALIDOS) {
  test(`400 para ${nome}`, async (t) => {
    const api = await subir();
    t.after(api.fechar);
    const r = await pedir(api.base, caminho);
    assert.equal(r.status, 400);
    assert.deepEqual(r.corpo.erros, [{ campo, mensagem }]);
  });
}

test('página além do fim devolve lista vazia, sem próxima', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const r = await pedir(api.base, '/v1/itens?pagina=9');
  assert.equal(r.status, 200);
  assert.deepEqual(r.corpo.itens, []);
  assert.equal(r.corpo.total, 4);
  assert.equal(r.corpo.proxima, null);
});

test('GET /v1/itens/:codigo devolve o item, 404 se não existe e 400 fora do formato', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const item = await pedir(api.base, '/v1/itens/T1.2');
  assert.equal(item.status, 200);
  assert.deepEqual(item.corpo, { codigo: 'T1.2', texto: 'Segundo item, com `código`.', feito: false, issue: 12, conclusoes: [], trilha: 'T1' });
  const inexistente = await pedir(api.base, '/v1/itens/T1.9');
  assert.equal(inexistente.status, 404);
  assert.equal(inexistente.corpo.detail, 'O item T1.9 não existe no catálogo.');
  assert.equal((await pedir(api.base, '/v1/itens/abc')).status, 400);
});
