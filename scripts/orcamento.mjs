// T7.12: orçamento de peso da página. Confere o build em dist/ e falha se passar do limite.
// Uso: npm run build && node scripts/orcamento.mjs [pasta]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

/** Limites em bytes, já comprimidos com gzip (como a hospedagem entrega). */
export const LIMITES = {
  /** Tudo o que a página inicial baixa: HTML, CSS, JS e o CATALOGO.md. */
  total: 500 * 1024,
  /** Só o JavaScript. */
  js: 150 * 1024,
};

function arquivos(pasta) {
  return readdirSync(pasta, { recursive: true, encoding: 'utf8' })
    .map((f) => join(pasta, f))
    .filter((f) => statSync(f).isFile());
}

const comprimido = (caminho) => gzipSync(readFileSync(caminho), { level: 9 }).length;

/**
 * Scripts que bloqueiam a renderização: <script src> externo sem type="module",
 * defer ou async. Script inline pequeno (o do tema, antes da pintura) é permitido.
 */
export function scriptsQueBloqueiam(html) {
  return [...html.matchAll(/<script\b([^>]*)>/gi)]
    .map(([tag, atributos]) => ({ tag, atributos }))
    .filter(({ atributos }) => /\bsrc=/i.test(atributos))
    .filter(({ atributos }) => !/type=["']?module/i.test(atributos) && !/\b(defer|async)\b/i.test(atributos))
    .map(({ tag }) => tag);
}

/** Mede o build da pasta e devolve os números e os problemas encontrados. */
export function conferir(pasta) {
  const lista = arquivos(pasta).filter((f) => !f.endsWith('404.html')); // cópia do index.html
  const pesos = lista.map((f) => ({ arquivo: relative(pasta, f).replaceAll('\\', '/'), bytes: comprimido(f) }));
  const total = pesos.reduce((s, p) => s + p.bytes, 0);
  const js = pesos.filter((p) => p.arquivo.endsWith('.js')).reduce((s, p) => s + p.bytes, 0);
  const problemas = [];
  if (total > LIMITES.total) problemas.push(`total ${kb(total)} passa do limite de ${kb(LIMITES.total)}`);
  if (js > LIMITES.js) problemas.push(`JavaScript ${kb(js)} passa do limite de ${kb(LIMITES.js)}`);
  for (const tag of scriptsQueBloqueiam(readFileSync(join(pasta, 'index.html'), 'utf8'))) {
    problemas.push(`script bloqueia a renderização (use type="module" ou defer): ${tag}`);
  }
  return { pesos, total, js, problemas };
}

export const kb = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const pasta = process.argv[2] ?? fileURLToPath(new URL('../dist', import.meta.url));
  const { pesos, total, js, problemas } = conferir(pasta);
  for (const p of pesos.sort((a, b) => b.bytes - a.bytes)) console.log(`${kb(p.bytes).padStart(9)}  ${p.arquivo}`);
  console.log(`Total (gzip): ${kb(total)} de ${kb(LIMITES.total)} · JS (gzip): ${kb(js)} de ${kb(LIMITES.js)}`);
  if (problemas.length) {
    console.error(`Orçamento estourado:\n- ${problemas.join('\n- ')}`);
    process.exit(1);
  }
}
