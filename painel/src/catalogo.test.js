import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { lerCatalogo, pedacosDoTexto } from './catalogo.js';
import { lerCatalogo as lerNoScript } from '../../scripts/catalogo.mjs';

const exemplo = [
  '# Catálogo',
  '',
  '**Progresso:** 1 de 3 itens',
  '',
  '## T1 · Git e GitHub',
  'Roadmap de referência: [Git e GitHub](https://roadmap.sh/git-github)',
  '',
  '- [x] **T1.1** Trabalhar com o fluxo `feature/data`.',
  '- [ ] **T1.2** Abrir uma issue.',
  '',
  '## T2 · Frontend base',
  'Roadmaps de referência: [Frontend](https://roadmap.sh/frontend) · [CSS](https://roadmap.sh/css)',
  '',
  '- [ ] **T2.1** Montar a página.',
  '',
].join('\n');

describe('lerCatalogo', () => {
  it('lê trilhas, links do roadmap.sh e itens', () => {
    expect(lerCatalogo(exemplo)).toEqual([
      {
        codigo: 'T1',
        nome: 'Git e GitHub',
        roadmaps: [{ nome: 'Git e GitHub', url: 'https://roadmap.sh/git-github' }],
        itens: [
          { codigo: 'T1.1', texto: 'Trabalhar com o fluxo `feature/data`.', feito: true },
          { codigo: 'T1.2', texto: 'Abrir uma issue.', feito: false },
        ],
      },
      {
        codigo: 'T2',
        nome: 'Frontend base',
        roadmaps: [
          { nome: 'Frontend', url: 'https://roadmap.sh/frontend' },
          { nome: 'CSS', url: 'https://roadmap.sh/css' },
        ],
        itens: [{ codigo: 'T2.1', texto: 'Montar a página.', feito: false }],
      },
    ]);
  });

  it('aceita fim de linha do Windows e ignora o que vem antes da primeira trilha', () => {
    const trilhas = lerCatalogo(exemplo.replace(/\n/g, '\r\n'));
    expect(trilhas.map((t) => t.codigo)).toEqual(['T1', 'T2']);
    expect(trilhas[0].itens).toHaveLength(2);
  });

  it('devolve lista vazia para texto sem trilhas', () => {
    expect(lerCatalogo('')).toEqual([]);
    expect(lerCatalogo('# Só um título')).toEqual([]);
  });

  it('com o CATALOGO.md real, bate com o scripts/catalogo.mjs', () => {
    const texto = readFileSync(new URL('../../CATALOGO.md', import.meta.url), 'utf8');
    const nosso = lerCatalogo(texto);
    const { trilhas: doScript, erros } = lerNoScript(texto);
    expect(erros).toEqual([]);
    expect(nosso.map((t) => [t.codigo, t.nome])).toEqual(doScript.map((t) => [t.codigo, t.nome]));
    expect(nosso.flatMap((t) => t.itens)).toEqual(doScript.flatMap((t) => t.itens));
    for (const t of nosso) {
      expect(t.roadmaps.length, t.codigo).toBeGreaterThan(0);
      for (const r of t.roadmaps) expect(r.url).toMatch(/^https:\/\/roadmap\.sh\//);
    }
  });
});

describe('pedacosDoTexto', () => {
  it('separa o código entre crases', () => {
    expect(pedacosDoTexto('Escrever o `docs/MVP.md` do painel')).toEqual([
      { codigo: false, texto: 'Escrever o ' },
      { codigo: true, texto: 'docs/MVP.md' },
      { codigo: false, texto: ' do painel' },
    ]);
  });
});
