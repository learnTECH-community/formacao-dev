// Servidor estático mínimo para abrir o painel no navegador, sem dependência.
// Uso: node scripts/servir-painel.mjs   (porta 4317, ou PORT=xxxx)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, isAbsolute, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = fileURLToPath(new URL('../painel/', import.meta.url));
const tipos = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.svg': 'image/svg+xml',
};
const porta = Number(process.env.PORT) || 4317;

createServer(async (pedido, resposta) => {
  const caminho = decodeURIComponent(new URL(pedido.url, 'http://x').pathname);
  const arquivo = join(raiz, caminho.endsWith('/') ? `${caminho}index.html` : caminho);
  const dentro = relative(raiz, arquivo);
  if (dentro.startsWith('..') || isAbsolute(dentro)) {
    resposta.writeHead(403).end();
    return;
  }
  try {
    const corpo = await readFile(arquivo);
    resposta.writeHead(200, { 'Content-Type': tipos[extname(arquivo)] ?? 'application/octet-stream' }).end(corpo);
  } catch {
    resposta.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Não encontrado');
  }
}).listen(porta, '127.0.0.1', () => console.log(`Painel em http://127.0.0.1:${porta}/`));
