// T9.11: a semente fictícia funciona pela interface do repositório (memória e MongoDB).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PESSOAS, REPOSITORIO_DE_EXEMPLO } from '../src/banco/semear.mjs';
import { semearRepositorio } from '../src/banco/semear-repositorio.mjs';
import { criarRepositorioEmMemoria } from '../src/repositorios/memoria.mjs';
import { CATALOGO_DE_TESTE } from './apoio.mjs';
import { SEM_MONGO, repositorioMongoDeTeste } from './mongo.mjs';

async function conferir(repositorio) {
  const primeira = await semearRepositorio(repositorio, { textoDoCatalogo: CATALOGO_DE_TESTE });
  assert.ok(primeira.conclusoes > 0);
  assert.equal(primeira.novas, primeira.conclusoes);
  // Rodar de novo não duplica.
  const segunda = await semearRepositorio(repositorio, { textoDoCatalogo: CATALOGO_DE_TESTE });
  assert.deepEqual(segunda, { conclusoes: primeira.conclusoes, novas: 0 });
  // Só dados fictícios.
  for (const c of await repositorio.listarConclusoes()) {
    assert.ok(PESSOAS.includes(c.usuario), c.usuario);
    assert.ok(c.pr.startsWith(`${REPOSITORIO_DE_EXEMPLO}/pull/`), c.pr);
  }
}

test('semente pela interface: memória', () => conferir(criarRepositorioEmMemoria()));

test('semente pela interface: MongoDB', { skip: SEM_MONGO }, async () => conferir(await repositorioMongoDeTeste()));
