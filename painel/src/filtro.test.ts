import { describe, it, expect } from 'vitest';
import { filtrarItens, textoDaContagem } from './filtro';

const trilhas = [
  {
    codigo: 'T1',
    nome: 'Git',
    itens: [
      { codigo: 'T1.1', feito: true },
      { codigo: 'T1.2', feito: false },
    ],
  },
  { codigo: 'T2', nome: 'Frontend', itens: [{ codigo: 'T2.1', feito: false }] },
  { codigo: 'T3', nome: 'JS', itens: [] },
];

const codigos = (r: { itens: { codigo: string }[] }[]): string[] => r.flatMap((t) => t.itens.map((i) => i.codigo));

describe('filtrarItens', () => {
  it('sem filtro, devolve todas as trilhas com itens', () => {
    const r = filtrarItens(trilhas);
    expect(r.map((t) => t.codigo)).toEqual(['T1', 'T2']);
    expect(codigos(r)).toEqual(['T1.1', 'T1.2', 'T2.1']);
  });

  it('filtra por trilha', () => {
    expect(codigos(filtrarItens(trilhas, { trilha: 'T2' }))).toEqual(['T2.1']);
  });

  it('filtra por situação', () => {
    expect(codigos(filtrarItens(trilhas, { situacao: 'feitos' }))).toEqual(['T1.1']);
    expect(codigos(filtrarItens(trilhas, { situacao: 'a-fazer' }))).toEqual(['T1.2', 'T2.1']);
  });

  it('combina trilha e situação, e some com a trilha que fica sem itens', () => {
    expect(filtrarItens(trilhas, { trilha: 'T2', situacao: 'feitos' })).toEqual([]);
    expect(codigos(filtrarItens(trilhas, { trilha: 'T1', situacao: 'a-fazer' }))).toEqual(['T1.2']);
  });

  it('não altera os dados de entrada', () => {
    const copia = structuredClone(trilhas);
    filtrarItens(trilhas, { situacao: 'feitos' });
    expect(trilhas).toEqual(copia);
  });

  it('trilha que não existe dá lista vazia', () => {
    expect(filtrarItens(trilhas, { trilha: 'T99' })).toEqual([]);
  });
});

describe('textoDaContagem', () => {
  it('diz quantos itens aparecem', () => {
    expect(textoDaContagem(63, 63)).toBe('Mostrando todos os 63 itens.');
    expect(textoDaContagem(5, 63)).toBe('Mostrando 5 de 63 itens.');
    expect(textoDaContagem(0, 63)).toBe('Nenhum item com esses filtros.');
  });
});
