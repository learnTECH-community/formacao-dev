// T7.13: servidor estático do build (dist/) com compressão e cabeçalhos de cache.
// Serve para conferir localmente o que a hospedagem deve fazer, e para medir o LCP (T7.3)
// com os arquivos comprimidos, como no site publicado.
// Uso: npm run build && node scripts/servidor.mjs [porta]
import { createServer } from 'node:http';
import { closeSync, fstatSync, openSync, readFileSync } from 'node:fs';
import { extname, join, normalize, sep } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};
const COMPRIMIVEIS = new Set(['.html', '.js', '.css', '.md', '.json', '.svg']);
/** Arquivo com hash no nome (index-AbC123.js): o conteúdo nunca muda para o mesmo nome. */
const COM_HASH = /^\/assets\/.+-[\w-]{8,}\.\w+$/;

/** Cache-Control por arquivo: longo e imutável com hash; o resto sempre revalida. */
export function cacheDe(caminho) {
  return COM_HASH.test(caminho) ? 'public, max-age=31536000, immutable' : 'no-cache';
}

/** Escolhe a compressão pelo Accept-Encoding: Brotli, gzip ou nenhuma. */
export function codificacaoAceita(cabecalho = '') {
  const aceitas = cabecalho.split(',').map((p) => p.trim().split(';')[0]);
  if (aceitas.includes('br')) return 'br';
  if (aceitas.includes('gzip')) return 'gzip';
  return null;
}

/**
 * Abre o arquivo uma vez e lê data e conteúdo pelo mesmo descritor. Sem checar antes
 * e abrir depois: o arquivo não troca entre uma coisa e outra (corrida no disco).
 * Devolve null se não existe ou é uma pasta.
 */
export function lerArquivo(arquivo) {
  let descritor;
  try {
    descritor = openSync(arquivo, 'r');
    const info = fstatSync(descritor);
    if (info.isDirectory()) return null;
    return { bruto: readFileSync(descritor), mtimeMs: info.mtimeMs };
  } catch {
    return null;
  } finally {
    if (descritor !== undefined) closeSync(descritor);
  }
}

export function criarServidor(pasta) {
  const cache = new Map();
  function comprimir(arquivo, { bruto, mtimeMs }, codificacao) {
    const chave = `${arquivo}|${codificacao}|${mtimeMs}`;
    if (!cache.has(chave)) {
      cache.set(
        chave,
        codificacao === 'br'
          ? brotliCompressSync(bruto, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } })
          : gzipSync(bruto, { level: 9 }),
      );
    }
    return cache.get(chave);
  }

  return createServer((pedido, resposta) => {
    const caminho = decodeURIComponent(new URL(pedido.url, 'http://local').pathname);
    let arquivo = normalize(join(pasta, caminho));
    if (!arquivo.startsWith(normalize(pasta + sep)) && arquivo !== normalize(pasta)) {
      resposta.writeHead(403).end();
      return;
    }
    let status = 200;
    let lido = lerArquivo(arquivo);
    if (!lido) {
      // Rotas do React (/trilha/T2): devolve o index.html; arquivo com extensão que não existe é 404.
      if (extname(caminho)) status = 404;
      arquivo = join(pasta, status === 404 ? '404.html' : 'index.html');
      lido = lerArquivo(arquivo);
    }
    if (!lido) {
      resposta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-cache' }).end('Não encontrado');
      return;
    }
    const tipo = TIPOS[extname(arquivo)] ?? 'application/octet-stream';
    const cabecalhos = {
      'Content-Type': tipo,
      'Cache-Control': status === 200 ? cacheDe(caminho) : 'no-cache',
      'X-Content-Type-Options': 'nosniff',
      Vary: 'Accept-Encoding',
    };
    const codificacao = COMPRIMIVEIS.has(extname(arquivo)) ? codificacaoAceita(pedido.headers['accept-encoding']) : null;
    const corpo = codificacao ? comprimir(arquivo, lido, codificacao) : lido.bruto;
    if (codificacao) cabecalhos['Content-Encoding'] = codificacao;
    cabecalhos['Content-Length'] = corpo.length;
    resposta.writeHead(status, cabecalhos);
    resposta.end(pedido.method === 'HEAD' ? undefined : corpo);
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const porta = Number(process.argv[2]) || 4318;
  const pasta = fileURLToPath(new URL('../dist', import.meta.url));
  criarServidor(pasta).listen(porta, '127.0.0.1', () => console.log(`dist/ em http://127.0.0.1:${porta}/ (Brotli e gzip)`));
}
