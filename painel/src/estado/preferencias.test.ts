// T4.8: testes do reducer de preferências e da leitura dos fixados guardados.
import { describe, it, expect } from 'vitest';
import { lerFixados, preferenciasReducer, temaEmUso, type Preferencias } from './preferencias';

const base: Preferencias = { temaEscolhido: null, temaDoSistema: 'claro', fixados: [] };

describe('preferenciasReducer: tema', () => {
  it('sem escolha, o tema em uso é o do sistema', () => {
    expect(temaEmUso(base)).toBe('claro');
    expect(temaEmUso({ ...base, temaDoSistema: 'escuro' })).toBe('escuro');
  });

  it('"trocar-tema" escolhe o contrário do tema em uso', () => {
    const escuro = preferenciasReducer(base, { tipo: 'trocar-tema' });
    expect(escuro.temaEscolhido).toBe('escuro');
    expect(preferenciasReducer(escuro, { tipo: 'trocar-tema' }).temaEscolhido).toBe('claro');
    expect(preferenciasReducer({ ...base, temaDoSistema: 'escuro' }, { tipo: 'trocar-tema' }).temaEscolhido).toBe('claro');
  });

  it('a escolha vence o sistema, mesmo que o sistema mude', () => {
    const escolhido = preferenciasReducer(base, { tipo: 'trocar-tema' });
    const mudou = preferenciasReducer(escolhido, { tipo: 'tema-do-sistema-mudou', tema: 'claro' });
    expect(temaEmUso(mudou)).toBe('escuro');
  });

  it('o sistema mudar para o mesmo tema não cria estado novo', () => {
    expect(preferenciasReducer(base, { tipo: 'tema-do-sistema-mudou', tema: 'claro' })).toBe(base);
    expect(preferenciasReducer(base, { tipo: 'tema-do-sistema-mudou', tema: 'escuro' }).temaDoSistema).toBe('escuro');
  });
});

describe('preferenciasReducer: fixados', () => {
  it('"alternar-fixado" fixa e desafixa, na ordem em que foram fixados', () => {
    let p = preferenciasReducer(base, { tipo: 'alternar-fixado', codigo: 'T2.3' });
    p = preferenciasReducer(p, { tipo: 'alternar-fixado', codigo: 'T1.1' });
    expect(p.fixados).toEqual(['T2.3', 'T1.1']);
    p = preferenciasReducer(p, { tipo: 'alternar-fixado', codigo: 'T2.3' });
    expect(p.fixados).toEqual(['T1.1']);
  });

  it('não muda o estado anterior (imutável)', () => {
    const antes = { ...base, fixados: ['T1.1'] };
    preferenciasReducer(antes, { tipo: 'alternar-fixado', codigo: 'T2.1' });
    expect(antes.fixados).toEqual(['T1.1']);
  });

  it('"limpar-fixados" esvazia; já vazio, devolve o mesmo estado', () => {
    expect(preferenciasReducer({ ...base, fixados: ['T1.1'] }, { tipo: 'limpar-fixados' }).fixados).toEqual([]);
    expect(preferenciasReducer(base, { tipo: 'limpar-fixados' })).toBe(base);
  });
});

describe('lerFixados', () => {
  it('lê a lista guardada', () => {
    expect(lerFixados('["T2.3","T1.1"]')).toEqual(['T2.3', 'T1.1']);
  });

  it('nada guardado, JSON quebrado ou outro tipo viram lista vazia', () => {
    expect(lerFixados(null)).toEqual([]);
    expect(lerFixados('{quebrado')).toEqual([]);
    expect(lerFixados('{"T1.1":true}')).toEqual([]);
  });

  it('descarta o que não é código de item e repetições', () => {
    expect(lerFixados('["T1.1", 3, "<script>", "T1.1", null, "T10.2"]')).toEqual(['T1.1', 'T10.2']);
  });
});
