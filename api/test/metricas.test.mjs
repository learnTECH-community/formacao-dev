// T9.9: métricas da API no formato do Prometheus, sem dado pessoal.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { criarMetricas, metricasDoAmbiente } from '../src/metricas.mjs';
import { subir } from './apoio.mjs';

test('sem METRICAS, a rota /metricas não existe (404)', async (t) => {
  const api = await subir({ metricas: false });
  t.after(api.fechar);
  assert.equal((await fetch(`${api.base}/metricas`)).status, 404);
});

test('com METRICAS, conta os pedidos por método, rota (o modelo) e status, e mede a latência', async (t) => {
  const api = await subir({ metricas: true });
  t.after(api.fechar);
  await fetch(`${api.base}/v1/health`);
  await fetch(`${api.base}/v1/health`);
  await fetch(`${api.base}/v1/itens/T1.1`);
  await fetch(`${api.base}/v1/itens/T9.99`);
  await fetch(`${api.base}/v1/caminho-inventado-pessoa-ficticia`);
  const r = await fetch(`${api.base}/metricas`);
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type'), /^text\/plain; version=0\.0\.4/);
  const texto = await r.text();
  assert.match(texto, /^# TYPE api_pedidos_total counter$/m);
  assert.match(texto, /^api_pedidos_total\{metodo="GET",rota="\/v1\/health",status="200"\} 2$/m);
  // A rota é o modelo, não o código pedido.
  assert.match(texto, /^api_pedidos_total\{metodo="GET",rota="\/v1\/itens\/:codigo",status="200"\} 1$/m);
  assert.match(texto, /^api_pedidos_total\{metodo="GET",rota="\/v1\/itens\/:codigo",status="404"\} 1$/m);
  // Caminho que não existe não vira série nova.
  assert.match(texto, /^api_pedidos_total\{metodo="GET",rota="\(sem rota\)",status="404"\} 1$/m);
  assert.doesNotMatch(texto, /T1\.1|T9\.99|pessoa-ficticia|caminho-inventado/);
  // Histograma: baldes crescentes, +Inf igual ao count.
  assert.match(texto, /^# TYPE api_duracao_segundos histogram$/m);
  const baldes = [...texto.matchAll(/^api_duracao_segundos_bucket\{metodo="GET",rota="\/v1\/health",le="([^"]+)"\} (\d+)$/gm)].map((m) => [m[1], Number(m[2])]);
  assert.equal(baldes.length, 11);
  assert.deepEqual(baldes.at(-1), ['+Inf', 2]);
  for (let i = 1; i < baldes.length; i++) assert.ok(baldes[i][1] >= baldes[i - 1][1]);
  assert.match(texto, /^api_duracao_segundos_count\{metodo="GET",rota="\/v1\/health"\} 2$/m);
  assert.match(texto, /^api_duracao_segundos_sum\{metodo="GET",rota="\/v1\/health"\} [\d.]+$/m);
});

test('baldes do histograma pela duração e escape dos rótulos', () => {
  const m = criarMetricas();
  m.registrar({ metodo: 'GET', rota: '/a"b', status: 200, segundos: 0.03 });
  m.registrar({ metodo: 'GET', rota: '/a"b', status: 500, segundos: 7 });
  const texto = m.texto();
  assert.match(texto, /api_duracao_segundos_bucket\{metodo="GET",rota="\/a\\"b",le="0\.025"\} 0/);
  assert.match(texto, /api_duracao_segundos_bucket\{metodo="GET",rota="\/a\\"b",le="0\.05"\} 1/);
  assert.match(texto, /api_duracao_segundos_bucket\{metodo="GET",rota="\/a\\"b",le="5"\} 1/);
  assert.match(texto, /api_duracao_segundos_bucket\{metodo="GET",rota="\/a\\"b",le="\+Inf"\} 2/);
  assert.match(texto, /api_pedidos_total\{metodo="GET",rota="\/a\\"b",status="500"\} 1/);
});

test('METRICAS aceita sim, 1 ou true', () => {
  assert.equal(metricasDoAmbiente('sim'), true);
  assert.equal(metricasDoAmbiente(undefined), false);
  assert.equal(metricasDoAmbiente('nao'), false);
});
