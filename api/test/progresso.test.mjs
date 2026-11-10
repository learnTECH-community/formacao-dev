// T6.2: consultas de progresso por trilha e por pessoa, com dados fictícios.
// T6.10: a view v_progresso_trilha bate com o cálculo do painel (T3.2).
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { progressoPorTrilha as calculoDoPainel } from '../../painel/src/progresso.ts';
import { abrirBanco } from '../src/banco/conexao.mjs';
import { consulta } from '../src/banco/consultas.mjs';
import { migrar } from '../src/banco/migrar.mjs';
import { semear } from '../src/banco/semear.mjs';
import { comConclusoes, trilhasDoTexto } from '../src/catalogo.mjs';
import { criarRepositorioEmMemoria } from '../src/repositorios/memoria.mjs';
import { criarRepositorioSqlite } from '../src/repositorios/sqlite.mjs';
import { CATALOGO_DE_TESTE, conclusao, subir } from './apoio.mjs';
import { SEM_MONGO, repositorioMongoDeTeste } from './mongo.mjs';

const TRILHAS = trilhasDoTexto(CATALOGO_DE_TESTE);

function sqlite() {
  const banco = abrirBanco(':memory:');
  migrar(banco);
  return { banco, repositorio: criarRepositorioSqlite(banco) };
}

const IMPLEMENTACOES = [
  ['memória', () => criarRepositorioEmMemoria()],
  ['SQLite', () => sqlite().repositorio],
  ['MongoDB', repositorioMongoDeTeste, SEM_MONGO],
];

for (const [nome, criar, pular = false] of IMPLEMENTACOES) {
  describe(`progresso: ${nome}`, { skip: pular }, () => {
    test('por trilha, na ordem do catálogo: marcado ou com conclusão conta como feito', async () => {
      const r = await criar();
      await r.gravarCatalogo(TRILHAS);
      await r.registrarConclusao(conclusao('T2.1', 'pessoa-a', 1));
      await r.registrarConclusao(conclusao('T2.1', 'pessoa-b', 2));
      await r.registrarConclusao(conclusao('T1.1', 'pessoa-b', 3)); // T1.1 já está marcado
      assert.deepEqual(await r.progressoPorTrilha(), [
        { trilha: 'T1', nome: 'Trilha um', feitos: 1, total: 2, percentual: 50 },
        { trilha: 'T2', nome: 'Trilha dois', feitos: 1, total: 2, percentual: 50 },
      ]);
    });

    test('por pessoa: concluídos, trilhas, percentual e datas; empate em ordem alfabética', async () => {
      const r = await criar();
      await r.gravarCatalogo(TRILHAS);
      await r.registrarConclusao({ ...conclusao('T1.2', 'pessoa-b', 1), concluidaEm: '2026-11-01T10:00:00.000Z' });
      await r.registrarConclusao({ ...conclusao('T2.1', 'pessoa-b', 2), concluidaEm: '2026-11-03T10:00:00.000Z' });
      await r.registrarConclusao({ ...conclusao('T1.1', 'pessoa-c', 3), concluidaEm: '2026-11-02T10:00:00.000Z' });
      await r.registrarConclusao({ ...conclusao('T2.2', 'pessoa-a', 4), concluidaEm: '2026-11-04T10:00:00.000Z' });
      assert.deepEqual(await r.progressoPorPessoa(), [
        { usuario: 'pessoa-b', concluidos: 2, trilhas: 2, percentual: 50, primeira: '2026-11-01T10:00:00.000Z', ultima: '2026-11-03T10:00:00.000Z' },
        { usuario: 'pessoa-a', concluidos: 1, trilhas: 1, percentual: 25, primeira: '2026-11-04T10:00:00.000Z', ultima: '2026-11-04T10:00:00.000Z' },
        { usuario: 'pessoa-c', concluidos: 1, trilhas: 1, percentual: 25, primeira: '2026-11-02T10:00:00.000Z', ultima: '2026-11-02T10:00:00.000Z' },
      ]);
    });

    test('trilha sem item mostra 0%, sem dividir por zero', async () => {
      const r = await criar();
      await r.gravarCatalogo([{ codigo: 'T1', nome: 'Vazia', itens: [] }]);
      assert.deepEqual(await r.progressoPorTrilha(), [{ trilha: 'T1', nome: 'Vazia', feitos: 0, total: 0, percentual: 0 }]);
    });
  });
}

test('T6.10: a view bate com o cálculo do painel (progresso.ts), com o catálogo real e os dados fictícios', async () => {
  const banco = abrirBanco(':memory:');
  semear(banco);
  const repositorio = criarRepositorioSqlite(banco);
  const trilhas = trilhasDoTexto(readFileSync(new URL('../../CATALOGO.md', import.meta.url), 'utf8'));
  const doPainel = calculoDoPainel(comConclusoes(trilhas, await repositorio.listarConclusoes()));
  const daView = await repositorio.progressoPorTrilha();
  assert.equal(daView.length, doPainel.size);
  for (const linha of daView) {
    const { feitos, total, percentual } = doPainel.get(linha.trilha);
    assert.deepEqual({ feitos: linha.feitos, total: linha.total, percentual: linha.percentual }, { feitos, total, percentual }, linha.trilha);
  }
});

test('T6.10: a API lê da view, sem repetir o cálculo', () => {
  const repositorio = readFileSync(new URL('../src/repositorios/sqlite.mjs', import.meta.url), 'utf8');
  const rota = readFileSync(new URL('../src/rotas/progresso.mjs', import.meta.url), 'utf8');
  assert.match(consulta('progresso_por_trilha'), /FROM v_progresso_trilha/);
  assert.doesNotMatch(repositorio + rota, /percentual\s*[:=]/);
});

test('rotas GET /v1/progresso/trilhas e /v1/progresso/pessoas usam as consultas', async (t) => {
  const { repositorio } = sqlite();
  const api = await subir({ repositorio });
  t.after(api.fechar);
  await fetch(`${api.base}/v1/catalogo`); // grava o catálogo no banco
  await repositorio.registrarConclusao(conclusao('T2.2', 'pessoa-a', 1));
  const trilhas = await (await fetch(`${api.base}/v1/progresso/trilhas`)).json();
  assert.deepEqual(trilhas.trilhas[1], { trilha: 'T2', nome: 'Trilha dois', feitos: 1, total: 2, percentual: 50 });
  const pessoas = await (await fetch(`${api.base}/v1/progresso/pessoas`)).json();
  assert.equal(pessoas.pessoas[0].usuario, 'pessoa-a');
});

test('T6.2: o plano de execução usa os índices onde importa', () => {
  const banco = abrirBanco(':memory:');
  semear(banco);
  const plano = (sql) =>
    banco
      .prepare(`EXPLAIN QUERY PLAN ${sql}`)
      .all()
      .map((l) => l.detail);
  const porTrilha = plano(consulta('progresso_por_trilha'));
  // O EXISTS de cada item procura a conclusão pelo índice da UNIQUE (item, usuario).
  assert.ok(porTrilha.some((d) => /SEARCH c USING COVERING INDEX sqlite_autoindex_conclusoes_1 \(item=\?\)/.test(d)), porTrilha.join('\n'));
  // Os itens de cada trilha vêm pelo índice idx_itens_trilha.
  assert.ok(porTrilha.some((d) => /SEARCH i USING (COVERING )?INDEX idx_itens_trilha \(trilha=\?\)/.test(d)), porTrilha.join('\n'));
  const porPessoa = plano(consulta('progresso_por_pessoa'));
  // Cada conclusão acha o item pela chave primária.
  assert.ok(porPessoa.some((d) => /SEARCH i USING INDEX sqlite_autoindex_itens_1 \(codigo=\?\)/.test(d)), porPessoa.join('\n'));
});
