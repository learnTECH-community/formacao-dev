// T5.11: GET /v1/progresso.csv exporta o progresso por stream: as linhas saem uma
// a uma, com pressão de volta (pipeline), sem montar o arquivo inteiro na memória.
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { comConclusoes } from '../catalogo.mjs';

export const COLUNAS = ['trilha', 'codigo', 'texto', 'feito', 'usuarios', 'prs'];

/**
 * Um campo no formato CSV (RFC 4180): entre aspas se tiver vírgula, aspas ou quebra
 * de linha, com as aspas dobradas. Texto que começa com = + - @ ganha um apóstrofo
 * na frente, para a planilha não o tratar como fórmula (injeção de CSV).
 */
export function campoCsv(valor) {
  let texto = String(valor ?? '');
  if (/^[=+\-@\t\r]/.test(texto)) texto = `'${texto}`;
  return /[",\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

export const linhaCsv = (campos) => `${campos.map(campoCsv).join(',')}\r\n`;

/** Gera as linhas do CSV, uma por vez. */
export function* linhasDoProgresso(trilhas) {
  yield linhaCsv(COLUNAS);
  for (const t of trilhas) {
    for (const i of t.itens) {
      yield linhaCsv([
        t.codigo,
        i.codigo,
        i.texto,
        i.feito ? 'sim' : 'não',
        i.conclusoes.map((c) => c.usuario).join(' '),
        i.conclusoes.map((c) => c.pr).join(' '),
      ]);
    }
  }
}

export function rotaDoCsv({ rota, trilhas, repositorio }) {
  rota('get', '/progresso.csv', async (_pedido, resposta) => {
    const dados = comConclusoes(await trilhas(), await repositorio.listarConclusoes());
    resposta.status(200);
    resposta.set('Content-Type', 'text/csv; charset=utf-8');
    resposta.set('Content-Disposition', 'attachment; filename="progresso.csv"');
    // BOM: o Excel abre o UTF-8 com acentos certos.
    const linhas = (function* () {
      yield '﻿';
      yield* linhasDoProgresso(dados);
    })();
    await pipeline(Readable.from(linhas), resposta);
  });
}
