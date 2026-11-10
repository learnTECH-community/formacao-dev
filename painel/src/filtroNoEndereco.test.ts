import { describe, it, expect } from 'vitest';
import { escreverFiltro, lerFiltro } from './filtroNoEndereco';

const codigos = ['T1', 'T2'];
const ler = (busca: string) => lerFiltro(new URLSearchParams(busca), codigos);

describe('lerFiltro', () => {
  it('sem parâmetros, devolve o padrão', () => {
    expect(ler('')).toEqual({ trilha: '', situacao: 'todos' });
  });

  it('lê trilha e situação válidas', () => {
    expect(ler('?trilha=T2&situacao=feitos')).toEqual({ trilha: 'T2', situacao: 'feitos' });
    expect(ler('situacao=a-fazer')).toEqual({ trilha: '', situacao: 'a-fazer' });
  });

  it('valor inválido cai no padrão', () => {
    expect(ler('?trilha=T99&situacao=qualquer')).toEqual({ trilha: '', situacao: 'todos' });
    expect(ler('?trilha=t2')).toEqual({ trilha: '', situacao: 'todos' });
  });
});

describe('escreverFiltro', () => {
  it('o padrão não aparece no endereço', () => {
    expect(escreverFiltro({ trilha: '', situacao: 'todos' }).toString()).toBe('');
  });

  it('escreve só o que foi escolhido, e a leitura devolve o mesmo', () => {
    const escrito = escreverFiltro({ trilha: 'T1', situacao: 'a-fazer' });
    expect(escrito.toString()).toBe('trilha=T1&situacao=a-fazer');
    expect(lerFiltro(escrito, codigos)).toEqual({ trilha: 'T1', situacao: 'a-fazer' });
  });
});
