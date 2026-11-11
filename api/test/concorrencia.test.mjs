// T6.5: dois pedidos ao mesmo tempo não registram a mesma conclusão duas vezes.
// Dois apps (como dois servidores) abrem o mesmo arquivo de banco, cada um com a
// sua conexão, e recebem a mesma conclusão ao mesmo tempo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { abrirBanco } from '../src/banco/conexao.mjs';
import { migrar } from '../src/banco/migrar.mjs';
import { criarRepositorioSqlite } from '../src/repositorios/sqlite.mjs';
import { subir } from './apoio.mjs';

const CONCLUSAO = { item: 'T1.2', usuario: 'pessoa-ficticia', pr: 'https://github.com/exemplo/repo/pull/3' };

test('pedidos simultâneos em dois servidores gravam uma linha só: 201 uma vez, 200 nas outras', async (t) => {
  const pasta = mkdtempSync(join(tmpdir(), 'concorrencia-'));
  const caminho = join(pasta, 'painel.db');
  const bancos = [abrirBanco(caminho), abrirBanco(caminho)];
  migrar(bancos[0]);
  const apis = await Promise.all(bancos.map((b) => subir({ repositorio: criarRepositorioSqlite(b) })));
  t.after(async () => {
    await Promise.all(apis.map((a) => a.fechar()));
    for (const b of bancos) b.close();
    rmSync(pasta, { recursive: true });
  });
  // Cada app grava o catálogo no banco na primeira leitura.
  await Promise.all(apis.map((a) => fetch(`${a.base}/v1/catalogo`)));

  const pedidos = Array.from({ length: 20 }, (_, i) =>
    fetch(`${apis[i % 2].base}/v1/conclusoes`, { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: apis[i % 2].cookieDe() }, body: JSON.stringify(CONCLUSAO) }),
  );
  const respostas = await Promise.all(pedidos);
  const status = respostas.map((r) => r.status).sort();
  const corpos = await Promise.all(respostas.map((r) => r.json()));

  assert.deepEqual(status, [...Array(19).fill(200), 201]);
  assert.equal(new Set(corpos.map((c) => c.id)).size, 1);
  const linhas = bancos[1].prepare('SELECT count(*) AS n FROM conclusoes WHERE item = ? AND usuario = ?').get(CONCLUSAO.item, CONCLUSAO.usuario).n;
  assert.equal(linhas, 1);
});

test('a restrição UNIQUE do banco recusa a repetição até num INSERT sem ON CONFLICT', () => {
  const banco = abrirBanco(':memory:');
  migrar(banco);
  banco.exec("INSERT INTO trilhas VALUES ('T1', 'Um', 1); INSERT INTO itens VALUES ('T1.1', 'T1', 'x', 0, 1)");
  const inserir = "INSERT INTO conclusoes (item, usuario, pr, concluida_em) VALUES ('T1.1', 'pessoa-a', 'https://github.com/exemplo/repo/pull/1', '2026-11-10T12:00:00.000Z')";
  banco.exec(inserir);
  assert.throws(() => banco.exec(inserir), /UNIQUE constraint failed: conclusoes.item, conclusoes.usuario/);
});
