// T7.12: o orçamento de peso falha quando o build passa do limite.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { conferir, scriptsQueBloqueiam } from './orcamento.mjs';

function buildFalso(arquivos) {
  const pasta = mkdtempSync(join(tmpdir(), 'orcamento-'));
  mkdirSync(join(pasta, 'assets'));
  for (const [nome, conteudo] of Object.entries(arquivos)) writeFileSync(join(pasta, nome), conteudo);
  return pasta;
}

const HTML_OK = '<!doctype html><script>/* tema */</script><script type="module" src="/assets/a.js"></script>';

test('build pequeno passa no orçamento', () => {
  const pasta = buildFalso({ 'index.html': HTML_OK, 'assets/a.js': 'console.log(1)' });
  try {
    assert.deepEqual(conferir(pasta).problemas, []);
  } finally {
    rmSync(pasta, { recursive: true });
  }
});

test('JavaScript acima de 150 KB comprimido estoura o orçamento', () => {
  // Bytes aleatórios não comprimem: 200 KB continuam ~200 KB no gzip.
  const pasta = buildFalso({ 'index.html': HTML_OK, 'assets/a.js': randomBytes(200 * 1024).toString('base64') });
  try {
    const { problemas } = conferir(pasta);
    assert.equal(problemas.length, 1);
    assert.match(problemas[0], /^JavaScript .* passa do limite de 150\.0 KB$/);
  } finally {
    rmSync(pasta, { recursive: true });
  }
});

test('total acima de 500 KB estoura o orçamento', () => {
  const pasta = buildFalso({ 'index.html': HTML_OK, 'CATALOGO.md': randomBytes(500 * 1024).toString('base64') });
  try {
    assert.match(conferir(pasta).problemas.join(), /^total .* passa do limite de 500\.0 KB/);
  } finally {
    rmSync(pasta, { recursive: true });
  }
});

test('script externo sem module, defer ou async bloqueia a renderização', () => {
  assert.deepEqual(scriptsQueBloqueiam('<script src="/x.js"></script>'), ['<script src="/x.js">']);
  assert.deepEqual(scriptsQueBloqueiam('<script defer src="/x.js"></script><script type="module" src="/y.js"></script>'), []);
  assert.deepEqual(scriptsQueBloqueiam('<script>inline</script>'), []);
});
