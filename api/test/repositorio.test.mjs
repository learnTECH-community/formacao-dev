// T5.6: o contrato do repositório. A mesma bateria vale para qualquer implementação
// (memória agora; banco na T6), listada em IMPLEMENTACOES.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { criarRepositorioEmMemoria } from '../src/repositorios/memoria.mjs';
import { conclusao } from './apoio.mjs';

const IMPLEMENTACOES = [['memória', async () => criarRepositorioEmMemoria()]];

for (const [nome, criar] of IMPLEMENTACOES) {
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
      assert.deepEqual(await r.saude(), { conclusoes: 3 });
    });

    test('a mesma pessoa no mesmo item devolve a conclusão que já existia', async () => {
      const r = await criar();
      const primeira = await r.registrarConclusao(conclusao('T1.1', 'pessoa-a', 1));
      const repetida = await r.registrarConclusao(conclusao('T1.1', 'pessoa-a', 9));
      assert.equal(repetida.criada, false);
      assert.deepEqual(repetida.conclusao, primeira.conclusao);
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
