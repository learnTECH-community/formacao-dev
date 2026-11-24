// Lê o CATALOGO.md, confere os códigos dos itens e calcula o progresso.
// Uso: node scripts/catalogo.mjs            -> confere e mostra o progresso
//      node scripts/catalogo.mjs --atualizar -> também reescreve a linha "Progresso" do catálogo
//      --arquivo <caminho>                    -> outro arquivo no lugar do CATALOGO.md (usado nos testes)
// Códigos de saída (R19 QA do #362):
//   0 -> catálogo válido e linha "Progresso" em dia (ou atualizada com --atualizar);
//   1 -> catálogo inválido: item fora do formato, código repetido, item na trilha errada,
//        linha "Progresso" ausente ou repetida, ou catálogo sem itens. Nada é gravado;
//   2 -> catálogo válido, mas a linha "Progresso" está desatualizada: rode com --atualizar;
//   3 -> não deu para ler o arquivo.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ITEM = /^- \[( |x)\] \*\*(T\d+\.\d+)\*\* (.+)$/;
// Toda linha que parece item ("- [", "* [", indentada ou "-[") é candidata: se não casar com o ITEM,
// vira erro, em vez de sumir da conta calada (checklist de autorrevisão, item 17).
const CANDIDATO = /^\s*[-*]\s*\[/;
const TRILHA = /^## (T\d+) · (.+)$/;
const PROGRESSO = /^\*\*Progresso:\*\* .*$/m;
const PROGRESSO_G = /^\*\*Progresso:\*\* .*$/gm;

export const SAIDA = { ok: 0, invalido: 1, desatualizado: 2, leitura: 3 };

export function lerCatalogo(texto) {
  const trilhas = [];
  const erros = [];
  const vistos = new Set();
  for (const [i, linha] of texto.split(/\r?\n/).entries()) {
    const t = linha.match(TRILHA);
    if (t) { trilhas.push({ codigo: t[1], nome: t[2], itens: [] }); continue; }
    if (!CANDIDATO.test(linha)) continue;
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

/** Os erros que valem para a conferência e para o --atualizar: formato, a linha "Progresso" e catálogo vazio. */
export function errosDoCatalogo(texto) {
  const { trilhas, erros } = lerCatalogo(texto);
  const linhas = texto.match(PROGRESSO_G) ?? [];
  if (!linhas.length) erros.push('o arquivo não tem a linha "**Progresso:** ..."; acrescente-a');
  if (linhas.length > 1) erros.push(`a linha "**Progresso:** ..." aparece ${linhas.length} vezes; deixe uma só`);
  if (!trilhas.length || !progresso(trilhas).total) erros.push('nenhuma trilha ou nenhum item: o arquivo pode estar truncado');
  return { trilhas, erros };
}

/**
 * O texto com a linha "Progresso" atualizada, ou os erros que impedem gravar. Não grava nada se o
 * catálogo for inválido (checklist de autorrevisão, itens 4 e 17: falhar fechado, e nada calado).
 */
export function atualizarTexto(texto) {
  const { trilhas, erros } = errosDoCatalogo(texto);
  if (erros.length) return { novo: null, erros };
  return { novo: texto.replace(PROGRESSO, linhaProgresso(progresso(trilhas))), erros };
}

/** Põe o nome do arquivo na frente de cada erro ("CATALOGO.md:4: ..."), como o editor e o CI esperam. */
export function comArquivo(nome, erros) {
  return erros.map((e) => {
    const m = e.match(/^linha (\d+): (.*)$/);
    return m ? `${nome}:${m[1]}: ${m[2]}` : `${nome}: ${e}`;
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf('--arquivo');
  const caminho = i > 0 ? process.argv[i + 1] : fileURLToPath(new URL('../CATALOGO.md', import.meta.url));
  const nome = basename(caminho);
  let texto;
  try {
    texto = readFileSync(caminho, 'utf8');
  } catch (e) {
    console.error(`${nome}: não deu para ler o arquivo (${e.code ?? e.message})`);
    process.exit(SAIDA.leitura);
  }
  const { trilhas, erros } = errosDoCatalogo(texto);
  if (erros.length) {
    console.error(comArquivo(nome, erros).join('\n'));
    process.exit(SAIDA.invalido);
  }
  const p = progresso(trilhas);
  for (const t of trilhas) {
    const f = t.itens.filter((item) => item.feito).length;
    console.log(`${t.codigo.padEnd(4)} ${String(f).padStart(2)}/${String(t.itens.length).padEnd(2)} ${t.nome}`);
  }
  console.log(linhaProgresso(p));
  if (process.argv.includes('--atualizar')) {
    writeFileSync(caminho, atualizarTexto(texto).novo);
  } else if (!texto.includes(linhaProgresso(p))) {
    console.error(`${nome}: a linha "Progresso" não bate; rode "node scripts/catalogo.mjs --atualizar"`);
    process.exit(SAIDA.desatualizado);
  }
}
