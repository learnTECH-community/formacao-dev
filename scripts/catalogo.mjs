// Lê o CATALOGO.md, confere os códigos dos itens e calcula o progresso.
// Uso: node scripts/catalogo.mjs            -> confere e mostra o progresso
//      node scripts/catalogo.mjs --atualizar -> também reescreve a linha "Progresso" do catálogo
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ITEM = /^- \[( |x)\] \*\*(T\d+\.\d+)\*\* (.+)$/;
const TRILHA = /^## (T\d+) · (.+)$/;
const PROGRESSO = /^\*\*Progresso:\*\* .*$/m;

export function lerCatalogo(texto) {
  const trilhas = [];
  const erros = [];
  const vistos = new Set();
  for (const [i, linha] of texto.split(/\r?\n/).entries()) {
    const t = linha.match(TRILHA);
    if (t) { trilhas.push({ codigo: t[1], nome: t[2], itens: [] }); continue; }
    if (!linha.startsWith('- [')) continue;
    const m = linha.match(ITEM);
    if (!m) { erros.push(`linha ${i + 1}: item fora do formato "- [ ] **Tn.m** texto"`); continue; }
    const [, marca, codigo, texto_] = m;
    const atual = trilhas.at(-1);
    if (!atual) { erros.push(`linha ${i + 1}: item ${codigo} antes de qualquer trilha`); continue; }
    if (!codigo.startsWith(`${atual.codigo}.`)) erros.push(`linha ${i + 1}: ${codigo} está na trilha ${atual.codigo}`);
    if (vistos.has(codigo)) erros.push(`linha ${i + 1}: código ${codigo} repetido`);
    vistos.add(codigo);
    atual.itens.push({ codigo, feito: marca === 'x', texto: texto_ });
  }
  return { trilhas, erros };
}

export function progresso(trilhas) {
  const itens = trilhas.flatMap((t) => t.itens);
  return { feitos: itens.filter((i) => i.feito).length, total: itens.length };
}

export function linhaProgresso({ feitos, total }) {
  return `**Progresso:** ${feitos} de ${total} itens`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const caminho = new URL('../CATALOGO.md', import.meta.url);
  const texto = readFileSync(caminho, 'utf8');
  const { trilhas, erros } = lerCatalogo(texto);
  const p = progresso(trilhas);
  for (const t of trilhas) {
    const f = t.itens.filter((i) => i.feito).length;
    console.log(`${t.codigo.padEnd(4)} ${String(f).padStart(2)}/${String(t.itens.length).padEnd(2)} ${t.nome}`);
  }
  console.log(linhaProgresso(p));
  if (process.argv.includes('--atualizar')) {
    writeFileSync(caminho, texto.replace(PROGRESSO, linhaProgresso(p)));
  } else if (!texto.includes(linhaProgresso(p))) {
    erros.push(`a linha "Progresso" do CATALOGO.md não bate: rode "node scripts/catalogo.mjs --atualizar"`);
  }
  if (erros.length) { console.error(erros.join('\n')); process.exit(1); }
}
