// T10.7: a API resiste a injeção de SQL. Texto de ataque nos filtros e parâmetros
// não muda o resultado: ou a validação recusa (400/404), ou a consulta parametrizada
// o trata como um valor qualquer. E nenhuma consulta é montada com texto de fora.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { abrirBanco } from '../src/banco/conexao.mjs';
import { migrar } from '../src/banco/migrar.mjs';
import { trilhasDoTexto } from '../src/catalogo.mjs';
import { criarRepositorioSqlite } from '../src/repositorios/sqlite.mjs';
import { CATALOGO_DE_TESTE, conclusao, subir } from './apoio.mjs';

const ATAQUES = ["' OR 1=1 --", "T1' OR '1'='1", "T1'; DROP TABLE conclusoes; --", '" OR ""="', 'T1 UNION SELECT usuario, pr FROM conclusoes --'];

async function sqlite() {
  const banco = abrirBanco(':memory:');
  migrar(banco);
  const repositorio = criarRepositorioSqlite(banco);
  await repositorio.gravarCatalogo(trilhasDoTexto(CATALOGO_DE_TESTE));
  await repositorio.registrarConclusao(conclusao('T1.1', 'pessoa-a', 1));
  await repositorio.registrarConclusao(conclusao('T1.2', 'pessoa-a', 2));
  await repositorio.registrarConclusao(conclusao('T2.1', 'pessoa-b', 3));
  return { banco, repositorio };
}

test('no repositório SQLite, o texto de ataque vira um valor: não acha nada e não apaga nada', async () => {
  const { banco, repositorio } = await sqlite();
  const todas = await repositorio.listarConclusoes();
  assert.equal(todas.length, 3);
  for (const ataque of ATAQUES) {
    assert.deepEqual(await repositorio.listarConclusoes({ usuario: ataque }), [], ataque);
    assert.deepEqual(await repositorio.listarConclusoes({ item: ataque }), [], ataque);
    assert.deepEqual(await repositorio.concluintesDaTrilha(ataque), [], ataque);
  }
  // A tabela segue inteira depois do "DROP TABLE".
  assert.equal(banco.prepare('SELECT count(*) AS n FROM conclusoes').get().n, 3);
  assert.deepEqual(await repositorio.listarConclusoes(), todas);
});

test("na API, o filtro com ' OR 1=1 -- é recusado e não muda o resultado", async (t) => {
  const { repositorio } = await sqlite();
  const api = await subir({ repositorio });
  t.after(api.fechar);
  const normal = await (await fetch(`${api.base}/v1/itens?trilha=T1`)).json();
  for (const ataque of ATAQUES) {
    const r = await fetch(`${api.base}/v1/itens?trilha=${encodeURIComponent(ataque)}`);
    assert.equal(r.status, 400, ataque);
    assert.equal(r.headers.get('content-type'), 'application/problem+json; charset=utf-8');
    const trilha = await fetch(`${api.base}/v1/trilhas/${encodeURIComponent(ataque)}/concluintes`);
    assert.equal(trilha.status, 404, ataque);
  }
  // Depois dos ataques, o mesmo filtro devolve o mesmo resultado.
  assert.deepEqual(await (await fetch(`${api.base}/v1/itens?trilha=T1`)).json(), normal);
  assert.equal((await repositorio.listarConclusoes()).length, 3);
});

test('nenhuma consulta SQL é montada com texto de fora (sem ${...} em prepare ou exec)', () => {
  const raiz = fileURLToPath(new URL('../src/', import.meta.url));
  const arquivos = readdirSync(raiz, { recursive: true }).filter((f) => f.endsWith('.mjs'));
  // Exceções: o backup e a semente contam as linhas de tabelas com nome fixo no código.
  const PERMITIDOS = ['.prepare(`SELECT count(*) AS n FROM ${t}`', '.prepare(`SELECT count(*) AS n FROM ${tabela}`'];
  const achados = [];
  for (const arquivo of arquivos) {
    const texto = readFileSync(join(raiz, arquivo), 'utf8');
    for (const m of texto.matchAll(/\.(?:prepare|exec)\(\s*`[^`]*`/g)) {
      if (m[0].includes('${') && !PERMITIDOS.includes(m[0])) achados.push(`${arquivo}: ${m[0].slice(0, 80)}`);
    }
  }
  assert.ok(arquivos.length > 10);
  assert.deepEqual(achados, []);
  // E as exceções usam mesmo nomes fixos: a lista TABELAS e chamadas com texto literal.
  assert.match(readFileSync(join(raiz, 'banco/backup.mjs'), 'utf8'), /const TABELAS = \['trilhas', 'itens', 'conclusoes', 'schema_migracoes'\]/);
  const chamadas = [...readFileSync(join(raiz, 'banco/semear.mjs'), 'utf8').matchAll(/contar\(([^)]*)\)/g)].map((m) => m[1]).filter((a) => a !== 'tabela');
  assert.ok(chamadas.length > 0);
  for (const argumento of chamadas) assert.match(argumento, /^'[a-z_]+'$/);
});

test('operador do MongoDB no corpo ({"$gt": ""}) é recusado com 400 antes de chegar ao banco', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  for (const corpo of [{ item: 'T1.1', usuario: { $gt: '' }, pr: 'https://github.com/exemplo/repo/pull/1' }, { item: { $ne: null }, usuario: 'pessoa-a', pr: 'https://github.com/exemplo/repo/pull/1' }]) {
    const r = await fetch(`${api.base}/v1/conclusoes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: api.cookieDe() }, body: JSON.stringify(corpo) });
    assert.equal(r.status, 400);
  }
  assert.deepEqual(await api.repositorio.listarConclusoes(), []);
});
