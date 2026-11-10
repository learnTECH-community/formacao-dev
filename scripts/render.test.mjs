// T9.5: o render.yaml não traz valor de segredo e usa as variáveis que a API lê.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const render = readFileSync(new URL('../render.yaml', import.meta.url), 'utf8');
const exemplo = readFileSync(new URL('../api/.env.example', import.meta.url), 'utf8');

/** Pares { chave, linha seguinte } das envVars do Blueprint. */
const variaveis = [...render.matchAll(/- key: (\w+)\n\s+(\w+): ?(.*)/g)].map(([, chave, campo, valor]) => ({ chave, campo, valor: valor.trim() }));

test('segredos do render.yaml ficam sem valor (sync: false ou gerado pelo Render)', () => {
  const SEGREDOS = ['MONGO_URL', 'GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET', 'GITHUB_TOKEN', 'CHAVE_DA_SESSAO'];
  for (const nome of SEGREDOS) {
    const v = variaveis.find((x) => x.chave === nome);
    assert.ok(v, `${nome} no render.yaml`);
    assert.ok((v.campo === 'sync' && v.valor === 'false') || (v.campo === 'generateValue' && v.valor === 'true'), `${nome}: ${v.campo}: ${v.valor}`);
  }
});

test('toda variável do render.yaml existe no api/.env.example', () => {
  assert.ok(variaveis.length >= 10);
  for (const { chave } of variaveis) assert.match(exemplo, new RegExp(`^${chave}=`, 'm'), chave);
});

test('a API publicada usa HTTPS, o MongoDB e o /v1/health', () => {
  assert.match(render, /- key: SO_HTTPS\n\s+value: sim/);
  assert.match(render, /- key: REPOSITORIO\n\s+value: mongo/);
  assert.match(render, /healthCheckPath: \/v1\/health/);
  assert.match(render, /dockerfilePath: \.\/api\/Dockerfile/);
});
