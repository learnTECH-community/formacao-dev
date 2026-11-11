// T10.12: a leitura das regras e dos relatórios do ZAP.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { alertasDoRelatorio, altosSemExcecao, lerRegras, resumo } from './zap.mjs';

const RELATORIO = {
  site: [
    {
      '@name': 'http://web:8080',
      alerts: [
        { pluginid: '40012', name: 'XSS refletido', riskcode: '3', count: '1' },
        { pluginid: '10038', name: 'CSP ausente', riskcode: '2', count: '4' },
        { pluginid: '10096', name: 'Data no texto', riskcode: '0', count: '2' },
      ],
    },
  ],
};

test('lê as regras e exige motivo para ignorar', () => {
  const { regras, erros } = lerRegras('# comentário\n10038\tWARN\t(CSP do painel na issue)\n10096\tIGNORE\t(datas do catálogo, não são vazamento)\n');
  assert.deepEqual(erros, []);
  assert.equal(regras.get('10038').acao, 'WARN');
  assert.equal(regras.get('10096').motivo, 'datas do catálogo, não são vazamento');
  assert.match(lerRegras('40012\tIGNORE\t\n').erros[0], /ignorada sem motivo/);
  assert.match(lerRegras('40012 IGNORE\n').erros[0], /use "id<TAB>/);
});

test('alerta alto sem exceção barra; com IGNORE e motivo, não', () => {
  const alertas = alertasDoRelatorio(RELATORIO);
  assert.equal(alertas.length, 3);
  assert.deepEqual(altosSemExcecao(alertas, lerRegras('').regras).map((a) => a.id), ['40012']);
  assert.deepEqual(altosSemExcecao(alertas, lerRegras('40012\tIGNORE\t(falso positivo: o texto é escapado, ver e2e/xss.spec.mjs)\n').regras), []);
  // WARN não basta para um alerto alto.
  assert.equal(altosSemExcecao(alertas, lerRegras('40012\tWARN\t(x)\n').regras).length, 1);
});

test('o resumo lista do mais alto ao mais baixo e marca os ignorados', () => {
  const linhas = resumo(alertasDoRelatorio(RELATORIO), lerRegras('10096\tIGNORE\t(motivo)\n').regras);
  assert.match(linhas[0], /^- alto: XSS refletido \(regra 40012/);
  assert.match(linhas[2], /informativo: Data no texto .*\[ignorado: motivo\]$/);
});

test('o arquivo de regras do repositório é válido', () => {
  const { erros } = lerRegras(readFileSync(new URL('../zap/regras.tsv', import.meta.url), 'utf8'));
  assert.deepEqual(erros, []);
});

// #267: sem porta fixa, o proxy do ZAP podia cair numa porta efêmera já usada e não subir.
test('as duas varreduras do ZAP usam a porta fixa, fora da faixa efêmera', () => {
  const fluxo = readFileSync(new URL('../.github/workflows/varreduras.yml', import.meta.url), 'utf8');
  const porta = Number(fluxo.split('ZAP_PORTA: "')[1]?.split('"')[0]);
  assert.ok(porta > 1024 && porta < 32768, `porta ${porta}`);
  for (const script of ['zap-baseline.py', 'zap-api-scan.py']) {
    assert.ok(fluxo.includes(`${script} -P "$ZAP_PORTA"`), script);
  }
});
