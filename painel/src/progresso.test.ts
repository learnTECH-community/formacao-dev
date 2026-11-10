import { describe, it, expect } from 'vitest';
import { progressoDe, progressoPorTrilha, progressoTotal, textoDoProgresso } from './progresso';

const itens = (feitos: number, aFazer: number): { feito: boolean }[] => [
  ...Array.from({ length: feitos }, () => ({ feito: true })),
  ...Array.from({ length: aFazer }, () => ({ feito: false })),
];

describe('progressoDe', () => {
  it('trilha vazia: 0 de 0, 0%, sem dividir por zero', () => {
    expect(progressoDe([])).toEqual({ feitos: 0, total: 0, percentual: 0 });
  });

  it('trilha completa: 100%', () => {
    expect(progressoDe(itens(5, 0))).toEqual({ feitos: 5, total: 5, percentual: 100 });
  });

  it('arredonda para baixo: 2 de 3 é 66%, 5 de 6 é 83%', () => {
    expect(progressoDe(itens(2, 1)).percentual).toBe(66);
    expect(progressoDe(itens(5, 1)).percentual).toBe(83);
  });

  it('nunca mostra 100% com item a fazer', () => {
    expect(progressoDe(itens(199, 1)).percentual).toBe(99);
  });
});

describe('progresso por trilha e total', () => {
  const trilhas = [
    { codigo: 'T1', itens: itens(1, 3) },
    { codigo: 'T2', itens: itens(2, 0) },
    { codigo: 'T3', itens: [] },
  ];

  it('calcula cada trilha pelo código', () => {
    const p = progressoPorTrilha(trilhas);
    expect(p.get('T1')).toEqual({ feitos: 1, total: 4, percentual: 25 });
    expect(p.get('T2')).toEqual({ feitos: 2, total: 2, percentual: 100 });
    expect(p.get('T3')).toEqual({ feitos: 0, total: 0, percentual: 0 });
  });

  it('soma o total de todas as trilhas', () => {
    expect(progressoTotal(trilhas)).toEqual({ feitos: 3, total: 6, percentual: 50 });
    expect(progressoTotal([])).toEqual({ feitos: 0, total: 0, percentual: 0 });
  });
});

describe('textoDoProgresso', () => {
  it('usa singular e plural', () => {
    expect(textoDoProgresso({ feitos: 3, total: 6 })).toBe('3 de 6 itens');
    expect(textoDoProgresso({ feitos: 0, total: 1 })).toBe('0 de 1 item');
  });
});
