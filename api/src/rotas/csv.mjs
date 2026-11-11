// T5.11: GET /v1/progresso.csv exporta o progresso por stream: as linhas saem uma
// a uma, com pressão de volta (espera o "drain" quando o buffer enche), sem montar
// o arquivo inteiro na memória. Se quem pediu fechar a conexão, a escrita para.
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

/**
 * Espera o buffer da resposta esvaziar: o evento "drain" ou, por segurança, a
 * checagem de writableNeedDrain a cada 20 ms. Para se a conexão fechar.
 */
function esvaziar(resposta) {
  return new Promise((pronto) => {
    const fim = () => {
      clearInterval(checagem);
      resposta.off('drain', fim);
      resposta.off('close', fim);
      pronto();
    };
    const checagem = setInterval(() => {
      if (!resposta.writableNeedDrain || resposta.destroyed) fim();
    }, 20);
    resposta.once('drain', fim);
    resposta.once('close', fim);
  });
}

export function rotaDoCsv({ rota, trilhas, repositorio }) {
  rota('get', '/progresso.csv', async (_pedido, resposta) => {
    const dados = comConclusoes(await trilhas(), await repositorio.listarConclusoes());
    resposta.status(200);
    resposta.set('Content-Type', 'text/csv; charset=utf-8');
    resposta.set('Content-Disposition', 'attachment; filename="progresso.csv"');
    // BOM: o Excel abre o UTF-8 com acentos certos.
    resposta.write(String.fromCharCode(0xfeff));
    for (const linha of linhasDoProgresso(dados)) {
      if (resposta.destroyed) return; // quem pediu foi embora
      // write devolve false quando o buffer está cheio: espera esvaziar.
      if (!resposta.write(linha)) await esvaziar(resposta);
    }
    resposta.end();
  });
}
