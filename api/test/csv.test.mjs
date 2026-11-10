// T5.11: exportar o progresso em CSV por stream.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { get } from 'node:http';
import { campoCsv, linhasDoProgresso } from '../src/rotas/csv.mjs';
import { conclusao, subir } from './apoio.mjs';

function catalogoComItens(n) {
  const linhas = ['# Catálogo', '', '## T1 · Uma trilha fictícia'];
  for (let i = 1; i <= n; i++) linhas.push(`- [${i % 3 === 0 ? 'x' : ' '}] **T1.${i}** Item fictício número ${i}, com vírgula.`);
  return `${linhas.join('\n')}\n`;
}

test('rota com Content-Type de CSV, nome de arquivo e envio em partes (chunked)', async (t) => {
  const api = await subir();
  t.after(api.fechar);
  const r = await fetch(`${api.base}/v1/progresso.csv`);
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'text/csv; charset=utf-8');
  assert.equal(r.headers.get('content-disposition'), 'attachment; filename="progresso.csv"');
  assert.equal(r.headers.get('transfer-encoding'), 'chunked');
  assert.equal(r.headers.get('content-length'), null);
  const texto = await r.text();
  assert.equal(texto.split('\r\n')[0], 'trilha,codigo,texto,feito,usuarios,prs');
});

test('10 mil linhas fictícias chegam em várias partes, todas certas', async (t) => {
  const api = await subir({ lerCatalogo: async () => catalogoComItens(10_000) });
  t.after(api.fechar);
  await api.repositorio.registrarConclusao(conclusao('T1.1', 'pessoa-a', 1));
  await api.repositorio.registrarConclusao(conclusao('T1.1', 'pessoa-b', 2));
  // Lê com o cliente do node:http, que mostra cada parte que chega ("data").
  const { partes, texto } = await new Promise((pronto, falhar) => {
    get(`${api.base}/v1/progresso.csv`, (resposta) => {
      resposta.setEncoding('utf8');
      let partes = 0;
      let texto = '';
      resposta.on('data', (pedaco) => {
        partes++;
        texto += pedaco;
      });
      resposta.on('end', () => pronto({ partes, texto }));
      resposta.on('error', falhar);
    }).on('error', falhar);
  });
  const linhas = texto.replace(/^﻿/, '').split('\r\n').filter(Boolean);
  assert.equal(linhas.length, 10_001);
  assert.ok(partes > 1, `chegou em ${partes} parte(s)`);
  assert.equal(linhas[1], 'T1,T1.1,"Item fictício número 1, com vírgula.",sim,pessoa-a pessoa-b,https://github.com/exemplo/repo/pull/1 https://github.com/exemplo/repo/pull/2');
  assert.equal(linhas[3], 'T1,T1.3,"Item fictício número 3, com vírgula.",sim,,');
  assert.equal(linhas[10_000].split(',')[1], 'T1.10000');
});

test('o gerador entrega uma linha por vez, sem montar o arquivo', () => {
  const linhas = linhasDoProgresso([{ codigo: 'T1', itens: [{ codigo: 'T1.1', texto: 'a', feito: false, conclusoes: [] }] }]);
  assert.equal(typeof linhas.next, 'function');
  assert.equal(linhas.next().value, 'trilha,codigo,texto,feito,usuarios,prs\r\n');
  assert.equal(linhas.next().value, 'T1,T1.1,a,não,,\r\n');
  assert.equal(linhas.next().done, true);
});

test('vírgulas, aspas e quebras de linha escapadas', () => {
  assert.equal(campoCsv('simples'), 'simples');
  assert.equal(campoCsv('a, b'), '"a, b"');
  assert.equal(campoCsv('diz "oi"'), '"diz ""oi"""');
  assert.equal(campoCsv('linha 1\nlinha 2'), '"linha 1\nlinha 2"');
  assert.equal(campoCsv(''), '');
  assert.equal(campoCsv(undefined), '');
});

test('texto que vira fórmula na planilha ganha um apóstrofo', () => {
  assert.equal(campoCsv('=SOMA(A1:A2)'), "'=SOMA(A1:A2)");
  assert.equal(campoCsv('+1'), "'+1");
  assert.equal(campoCsv('@x'), "'@x");
  assert.equal(campoCsv('-2, 3'), `"'-2, 3"`);
});
