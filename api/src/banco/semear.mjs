// T6.3: dados de teste fictícios. Leva o catálogo para o banco e grava conclusões
// de pessoas inventadas ("pessoa-ficticia-01" ...), com links de um repositório de
// exemplo e datas espalhadas por 6 semanas. Nada de dado pessoal real.
// É determinístico: a mesma semente gera os mesmos dados.
// Uso: node src/banco/semear.mjs [caminho do banco]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CAMINHO_PADRAO as CATALOGO, trilhasDoTexto } from '../catalogo.mjs';
import { gravarCatalogo } from './catalogo.mjs';
import { abrirBanco, caminhoDoBanco } from './conexao.mjs';
import { migrar } from './migrar.mjs';

export const PESSOAS = Array.from({ length: 12 }, (_, i) => `pessoa-ficticia-${String(i + 1).padStart(2, '0')}`);
export const REPOSITORIO_DE_EXEMPLO = 'https://github.com/exemplo/painel-de-formacao';
const INICIO = Date.parse('2026-09-28T12:00:00Z'); // segunda-feira

/** Gerador pseudoaleatório pequeno (mulberry32), para os dados saírem sempre iguais. */
function sorteio(semente) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Conclusões fictícias: cada pessoa faz uma parte dos itens das primeiras trilhas. */
export function conclusoesFicticias(trilhas, { semente = 42, pessoas = PESSOAS } = {}) {
  const aleatorio = sorteio(semente);
  const itens = trilhas.slice(0, 5).flatMap((t) => t.itens.map((i) => i.codigo));
  const conclusoes = [];
  let pr = 1;
  pessoas.forEach((usuario, p) => {
    // Quem vem antes na lista faz mais itens: o ranking não fica todo empatado.
    const quantos = Math.max(1, Math.round(itens.length * (0.6 - p * 0.045)));
    for (const item of itens.slice(0, quantos)) {
      const dia = Math.floor(aleatorio() * 42);
      conclusoes.push({ item, usuario, pr: `${REPOSITORIO_DE_EXEMPLO}/pull/${pr++}`, concluidaEm: new Date(INICIO + dia * 86_400_000).toISOString() });
    }
  });
  return conclusoes;
}

/** Migra, leva o catálogo e grava as conclusões fictícias. Devolve as contagens. */
export function semear(banco, { textoDoCatalogo = readFileSync(CATALOGO, 'utf8'), semente } = {}) {
  migrar(banco);
  const trilhas = trilhasDoTexto(textoDoCatalogo);
  gravarCatalogo(banco, trilhas);
  const inserir = banco.prepare(`INSERT INTO conclusoes (item, usuario, pr, concluida_em) VALUES (?, ?, ?, ?)
    ON CONFLICT (item, usuario) DO NOTHING`);
  banco.exec('BEGIN');
  for (const c of conclusoesFicticias(trilhas, { semente })) inserir.run(c.item, c.usuario, c.pr, c.concluidaEm);
  banco.exec('COMMIT');
  const contar = (tabela) => banco.prepare(`SELECT count(*) AS n FROM ${tabela}`).get().n;
  return { trilhas: contar('trilhas'), itens: contar('itens'), conclusoes: contar('conclusoes') };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const caminho = process.argv[2] ?? caminhoDoBanco();
  const banco = abrirBanco(caminho);
  const n = semear(banco);
  console.log(`${caminho}: ${n.trilhas} trilhas, ${n.itens} itens, ${n.conclusoes} conclusões fictícias`);
  banco.close();
}
