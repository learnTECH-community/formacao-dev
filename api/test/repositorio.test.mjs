// T5.6: o contrato do repositório. A mesma bateria roda contra todas as
// implementações listadas em IMPLEMENTACOES: memória e SQLite (T6.6).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { abrirBanco } from '../src/banco/conexao.mjs';
import { migrar } from '../src/banco/migrar.mjs';
import { trilhasDoTexto } from '../src/catalogo.mjs';
import { criarRepositorioEmMemoria } from '../src/repositorios/memoria.mjs';
import { criarRepositorioSqlite } from '../src/repositorios/sqlite.mjs';
import { CATALOGO_DE_TESTE, conclusao } from './apoio.mjs';

const TRILHAS = trilhasDoTexto(CATALOGO_DE_TESTE);

export const IMPLEMENTACOES = [
  ['memória', async () => criarRepositorioEmMemoria()],
  [
    'SQLite',
    async () => {
      const banco = abrirBanco(':memory:');
      migrar(banco);
      return criarRepositorioSqlite(banco);
    },
  ],
];

for (const [nome, criarVazio] of IMPLEMENTACOES) {
  const criar = async () => {
    const r = await criarVazio();
    await r.gravarCatalogo(TRILHAS);
    return r;
  };

  describe(`repositório: ${nome}`, () => {
    test('começa vazio', async () => {
      const r = await criar();
      assert.deepEqual(await r.saude(), { conclusoes: 0 });
      assert.deepEqual(await r.listarConclusoes(), []);
    });

    test('grava e lista em ordem de id, com filtro por item e por pessoa', async () => {
      const r = await criar();
      const a = await r.registrarConclusao(conclusao('T1.1', 'pessoa-a', 1));
      await r.registrarConclusao(conclusao('T1.2', 'pessoa-a', 2));
      await r.registrarConclusao(conclusao('T1.1', 'pessoa-b', 3));
      assert.equal(a.criada, true);
      assert.deepEqual(a.conclusao, { id: a.conclusao.id, ...conclusao('T1.1', 'pessoa-a', 1) });
      assert.deepEqual(
        (await r.listarConclusoes()).map((c) => c.pr.at(-1)),
        ['1', '2', '3'],
      );
      assert.deepEqual(
        (await r.listarConclusoes({ item: 'T1.1' })).map((c) => c.usuario),
        ['pessoa-a', 'pessoa-b'],
      );
      assert.deepEqual(
        (await r.listarConclusoes({ usuario: 'pessoa-a' })).map((c) => c.item),
        ['T1.1', 'T1.2'],
      );
      assert.deepEqual(await r.listarConclusoes({ item: 'T1.1', usuario: 'pessoa-b' }), [{ id: 3, ...conclusao('T1.1', 'pessoa-b', 3) }]);
      assert.deepEqual(await r.saude(), { conclusoes: 3 });
    });

    test('T6.5: a mesma pessoa no mesmo item devolve a conclusão que já existia, sem falhar', async () => {
      const r = await criar();
      const primeira = await r.registrarConclusao(conclusao('T1.1', 'pessoa-a', 1));
      const repetida = await r.registrarConclusao(conclusao('T1.1', 'pessoa-a', 9));
      assert.equal(repetida.criada, false);
      assert.deepEqual(repetida.conclusao, primeira.conclusao);
      assert.equal((await r.listarConclusoes()).length, 1);
    });

    test('T6.6: ler, atualizar e apagar pelo id', async () => {
      const r = await criar();
      const { conclusao: c } = await r.registrarConclusao(conclusao('T2.1', 'pessoa-a', 1));
      assert.deepEqual(await r.obterConclusao(c.id), c);
      const nova = 'https://github.com/exemplo/repo/pull/77';
      assert.deepEqual(await r.atualizarConclusao(c.id, { pr: nova }), { ...c, pr: nova });
      assert.equal((await r.obterConclusao(c.id)).pr, nova);
      assert.equal(await r.apagarConclusao(c.id), true);
      assert.equal(await r.obterConclusao(c.id), null);
      assert.equal(await r.apagarConclusao(c.id), false);
      assert.equal(await r.atualizarConclusao(c.id, { pr: nova }), null);
      assert.deepEqual(await r.saude(), { conclusoes: 0 });
    });

    test('T6.6: texto de fora não vira SQL (tentativa de injeção só filtra)', async () => {
      const r = await criar();
      await r.registrarConclusao(conclusao('T1.1', 'pessoa-a'));
      assert.deepEqual(await r.listarConclusoes({ usuario: "x' OR '1'='1" }), []);
      assert.deepEqual(await r.listarConclusoes({ item: "T1.1'; DELETE FROM conclusoes; --" }), []);
      assert.equal((await r.listarConclusoes()).length, 1);
    });

    test('quem recebe a lista não altera o que está guardado', async () => {
      const r = await criar();
      await r.registrarConclusao(conclusao('T1.1', 'pessoa-a'));
      (await r.listarConclusoes())[0].usuario = 'outra';
      assert.equal((await r.listarConclusoes())[0].usuario, 'pessoa-a');
    });
  });
}

test('T6.6: o repositório SQLite não monta SQL com texto: toda consulta usa parâmetros', () => {
  const codigo = readFileSync(new URL('../src/repositorios/sqlite.mjs', import.meta.url), 'utf8');
  const consultas = [...codigo.matchAll(/prepare\((`[^`]*`|'[^']*')\)/g)].map((m) => m[1]);
  assert.ok(consultas.length >= 7);
  for (const consulta of consultas) assert.doesNotMatch(consulta, /\$\{/, `consulta com interpolação: ${consulta}`);
  // Nenhum prepare recebe uma variável ou concatenação.
  assert.doesNotMatch(codigo, /prepare\((?![`'])/);
  assert.doesNotMatch(codigo, /\.exec\(/);
});
