// T7.13: compressão e cabeçalhos de cache do servidor estático.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { cacheDe, codificacaoAceita, criarServidor, lerArquivo } from './servidor.mjs';

let pasta;
let servidor;
let base;

before(async () => {
  pasta = mkdtempSync(join(tmpdir(), 'servidor-'));
  mkdirSync(join(pasta, 'assets'));
  const html = '<!doctype html><title>painel</title>' + '<p>texto</p>'.repeat(200);
  writeFileSync(join(pasta, 'index.html'), html);
  writeFileSync(join(pasta, '404.html'), html);
  writeFileSync(join(pasta, 'assets', 'index-AbCd1234.js'), 'console.log("painel");'.repeat(200));
  writeFileSync(join(pasta, 'CATALOGO.md'), '# Catálogo\n'.repeat(200));
  servidor = criarServidor(pasta);
  await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${servidor.address().port}`;
});

after(() => {
  servidor.close();
  rmSync(pasta, { recursive: true });
});

const pedir = (caminho, encoding = 'br, gzip') => fetch(base + caminho, { headers: { 'Accept-Encoding': encoding } });

test('JS com hash: Brotli e cache longo, imutável', async () => {
  const r = await pedir('/assets/index-AbCd1234.js');
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-encoding'), 'br');
  assert.equal(r.headers.get('cache-control'), 'public, max-age=31536000, immutable');
});

test('sem Brotli, usa gzip', async () => {
  const r = await pedir('/assets/index-AbCd1234.js', 'gzip');
  assert.equal(r.headers.get('content-encoding'), 'gzip');
});

test('HTML e CATALOGO.md: comprimidos e sempre revalidados', async () => {
  for (const caminho of ['/', '/CATALOGO.md']) {
    const r = await pedir(caminho);
    assert.equal(r.headers.get('content-encoding'), 'br', caminho);
    assert.equal(r.headers.get('cache-control'), 'no-cache', caminho);
  }
});

test('rota do React devolve o index.html; arquivo que não existe é 404', async () => {
  assert.equal((await pedir('/trilha/T2')).status, 200);
  assert.equal((await pedir('/assets/nao-existe-12345678.js')).status, 404);
});

test('funções de apoio', () => {
  assert.equal(cacheDe('/index.html'), 'no-cache');
  assert.equal(cacheDe('/assets/DetalheTrilha-fp-NUQb9.js'), 'public, max-age=31536000, immutable');
  assert.equal(codificacaoAceita('gzip, deflate, br;q=1.0'), 'br');
  assert.equal(codificacaoAceita('identity'), null);
});

// #266: o servidor abre o arquivo direto, sem checar antes (corrida no disco).
test('lerArquivo: pasta e arquivo que não existe dão null; arquivo dá conteúdo e data', () => {
  assert.equal(lerArquivo(join(pasta, 'assets')), null);
  assert.equal(lerArquivo(join(pasta, 'nao-existe.js')), null);
  const lido = lerArquivo(join(pasta, 'CATALOGO.md'));
  assert.ok(lido.bruto.toString('utf8').startsWith('# Catálogo'));
  assert.equal(typeof lido.mtimeMs, 'number');
});

test('pedido de uma pasta cai no index.html', async () => {
  const r = await pedir('/assets', 'identity');
  assert.equal(r.status, 200);
  assert.match(await r.text(), /<title>painel<\/title>/);
});
