// T5.2: validação da entrada de POST /v1/conclusoes, com zod e mensagens em português.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { subir } from './apoio.mjs';

const VALIDA = { item: 'T1.2', usuario: 'pessoa-ficticia', pr: 'https://github.com/exemplo/repo/pull/3' };

async function enviar(api, corpo, { bruto = false, cookie = api.cookieDe() } = {}) {
  const resposta = await fetch(`${api.base}/v1/conclusoes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) },
    body: bruto ? corpo : JSON.stringify(corpo),
  });
  return { status: resposta.status, tipo: resposta.headers.get('content-type'), corpo: await resposta.json() };
}

test('entrada válida grava a conclusão com a data do servidor e responde 201', async (t) => {
  const api = await subir({ relogio: () => new Date('2026-11-10T12:00:00.000Z') });
  t.after(api.fechar);
  const r = await enviar(api, VALIDA);
  assert.equal(r.status, 201);
  assert.deepEqual(r.corpo, { id: 1, ...VALIDA, concluidaEm: '2026-11-10T12:00:00.000Z' });
  assert.equal((await api.repositorio.listarConclusoes()).length, 1);
});

test('a mesma conclusão de novo responde 200 com a que já existia', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const primeira = await enviar(api, VALIDA);
  const repetida = await enviar(api, { ...VALIDA, pr: 'https://github.com/exemplo/repo/pull/99' });
  assert.equal(repetida.status, 200);
  assert.deepEqual(repetida.corpo, primeira.corpo);
});

const INVALIDOS = [
  ['item fora do formato', { ...VALIDA, item: 't1-2' }, 'item', 'item precisa estar no formato Tn.m, como T2.3.'],
  ['item ausente', { usuario: VALIDA.usuario, pr: VALIDA.pr }, 'item', 'item é obrigatório.'],
  ['usuario com espaço', { ...VALIDA, usuario: 'pessoa ficticia' }, 'usuario', 'usuario precisa ser um nome de usuário do GitHub: até 39 letras, números ou hífens.'],
  ['usuario com hífen no fim', { ...VALIDA, usuario: 'pessoa-' }, 'usuario', 'usuario precisa ser um nome de usuário do GitHub: até 39 letras, números ou hífens.'],
  ['usuario longo demais', { ...VALIDA, usuario: 'a'.repeat(40) }, 'usuario', 'usuario precisa ser um nome de usuário do GitHub: até 39 letras, números ou hífens.'],
  ['usuario que não é texto', { ...VALIDA, usuario: 42 }, 'usuario', 'usuario precisa ser texto.'],
  ['pr que não é link de PR', { ...VALIDA, pr: 'https://exemplo.com/pull/3' }, 'pr', 'pr precisa ser o link de um PR, como https://github.com/dono/repo/pull/12.'],
  ['campo desconhecido', { ...VALIDA, papel: 'mantenedor' }, '(corpo)', 'Campo desconhecido: papel.'],
  ['corpo que não é objeto', [VALIDA], '(corpo)', 'O corpo precisa ser um objeto JSON.'],
];

for (const [nome, corpo, campo, mensagem] of INVALIDOS) {
  test(`400 para ${nome}, com o campo e o motivo`, async (t) => {
    const api = await subir();
    t.after(api.fechar);
    const r = await enviar(api, corpo);
    assert.equal(r.status, 400);
    assert.match(r.tipo, /application\/problem\+json/);
    assert.equal(r.corpo.title, 'Entrada inválida');
    assert.deepEqual(r.corpo.erros, [{ campo, mensagem }]);
    assert.deepEqual(await api.repositorio.listarConclusoes(), []);
  });
}

test('400 lista todos os campos inválidos de uma vez', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const r = await enviar(api, {});
  assert.equal(r.status, 400);
  assert.deepEqual(
    r.corpo.erros.map((e) => e.campo),
    ['item', 'usuario', 'pr'],
  );
  assert.equal(r.corpo.detail, '3 campos estão inválidos: confira "erros".');
});

test('JSON malformado recebe 400', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const r = await enviar(api, '{"item": "T1.2",', { bruto: true });
  assert.equal(r.status, 400);
  assert.equal(r.corpo.title, 'JSON malformado');
});

test('item que não existe no catálogo recebe 404', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const r = await enviar(api, { ...VALIDA, item: 'T9.9' });
  assert.equal(r.status, 404);
  assert.equal(r.corpo.detail, 'O item T9.9 não existe no catálogo.');
});
