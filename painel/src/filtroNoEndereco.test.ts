import { describe, it, expect } from 'vitest';
import { escreverFiltro, lerFiltro, textoDaTrilhaInexistente, trilhaInexistente } from './filtroNoEndereco';

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

describe('trilhaInexistente (#348)', () => {
  const p = (busca: string) => new URLSearchParams(busca);
  it('avisa a trilha que não está no catálogo', () => {
    expect(trilhaInexistente(p('trilha=T99&situacao=feitos'), codigos)).toBe('T99');
  });
  it('não avisa trilha válida, ausente ou vazia', () => {
    expect(trilhaInexistente(p('trilha=T2'), codigos)).toBeNull();
    expect(trilhaInexistente(p(''), codigos)).toBeNull();
    expect(trilhaInexistente(p('trilha='), codigos)).toBeNull();
  });
  it('sem catálogo carregado não avisa, e um código longo é cortado', () => {
    expect(trilhaInexistente(p('trilha=T99'), [''])).toBeNull();
    expect(trilhaInexistente(p(`trilha=${'x'.repeat(50)}`), codigos)).toHaveLength(20);
  });
  it('o texto diz o que houve e o que a página fez', () => {
    expect(textoDaTrilhaInexistente('T99')).toBe('A trilha T99 não existe; o filtro voltou para todas as trilhas.');
  });
});
