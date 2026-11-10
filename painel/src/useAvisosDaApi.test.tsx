// @vitest-environment jsdom
// T5.8: o painel com a API: o aviso em tempo real atualiza a barra sem recarregar,
// e a conexão volta sozinha depois de uma queda.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, renderHook, screen } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { App } from './App';
import { ErroDaApi, enderecoNaApi, pedirNaApi, trilhasDaApi, urlDaApi, type CatalogoDaApi } from './api';
import { Provedores } from './teste/Provedores';
import { clienteDeTeste } from './teste/cliente';
import { esperaParaReconectar, useAvisosDaApi } from './useAvisosDaApi';
import { enderecoPadrao } from './useCatalogo';

/** EventSource falso: guarda as instâncias e deixa o teste disparar eventos. */
class FonteFalsa {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;
  static instancias: FonteFalsa[] = [];
  readyState = FonteFalsa.CONNECTING;
  private ouvintes = new Map<string, ((e: Event) => void)[]>();
  constructor(readonly url: string) {
    FonteFalsa.instancias.push(this);
  }
  addEventListener(tipo: string, ouvinte: (e: Event) => void) {
    this.ouvintes.set(tipo, [...(this.ouvintes.get(tipo) ?? []), ouvinte]);
  }
  close() {
    this.readyState = FonteFalsa.CLOSED;
  }
  emitir(tipo: string, estado?: number) {
    if (estado !== undefined) this.readyState = estado;
    for (const o of this.ouvintes.get(tipo) ?? []) o(new MessageEvent(tipo, { data: '{}' }));
  }
}
const Fonte = FonteFalsa as unknown as typeof EventSource;

const catalogo = (feitos: number): CatalogoDaApi => ({
  trilhas: [
    {
      codigo: 'T5',
      nome: 'Backend com Node e APIs',
      roadmaps: [{ nome: 'Backend', url: 'https://roadmap.sh/backend' }],
      itens: [
        { codigo: 'T5.1', texto: 'Criar a API.', feito: feitos >= 1 },
        { codigo: 'T5.2', texto: 'Validar a entrada.', feito: feitos >= 2, issue: 208 },
        { codigo: 'T5.3', texto: 'Documentar.', feito: feitos >= 3 },
      ],
    },
  ],
});
const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  FonteFalsa.instancias = [];
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('painel com a API (VITE_API_URL)', () => {
  it('um aviso "conclusao" atualiza a barra de progresso sem recarregar a página', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.teste/');
    vi.stubGlobal('EventSource', Fonte);
    let feitos = 1;
    const buscar = vi.fn(async () => json(catalogo(feitos)));
    vi.stubGlobal('fetch', buscar);
    render(
      <Provedores>
        <App />
      </Provedores>,
    );
    const barra = await screen.findByRole('progressbar', { name: 'Progresso do catálogo' });
    expect(barra).toHaveAttribute('aria-valuetext', '1 de 3 itens');
    expect(buscar).toHaveBeenCalledWith('http://api.teste/v1/catalogo', expect.anything());
    expect(FonteFalsa.instancias.map((f) => f.url)).toEqual(['http://api.teste/v1/eventos']);

    feitos = 2;
    act(() => FonteFalsa.instancias[0].emitir('conclusao'));
    await vi.waitFor(() => expect(screen.getByRole('progressbar', { name: 'Progresso do catálogo' })).toHaveAttribute('aria-valuetext', '2 de 3 itens'));
    expect(buscar).toHaveBeenCalledTimes(2);
  });

  it('sem VITE_API_URL, o painel não abre avisos e lê o CATALOGO.md', () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.stubGlobal('EventSource', Fonte);
    expect(urlDaApi()).toBeUndefined();
    expect(enderecoPadrao()).toMatch(/CATALOGO\.md$/);
    renderHook(() => useAvisosDaApi(), { wrapper: comCliente });
    expect(FonteFalsa.instancias).toEqual([]);
  });
});

function comCliente({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={clienteDeTeste()}>{children}</QueryClientProvider>;
}

describe('reconexão', () => {
  it('se o navegador desiste (CLOSED), abre outra conexão, esperando cada vez mais', () => {
    vi.useFakeTimers();
    renderHook(() => useAvisosDaApi({ base: 'http://api.teste', Fonte }), { wrapper: comCliente });
    expect(FonteFalsa.instancias).toHaveLength(1);
    act(() => FonteFalsa.instancias[0].emitir('error', FonteFalsa.CLOSED));
    act(() => vi.advanceTimersByTime(999));
    expect(FonteFalsa.instancias).toHaveLength(1);
    act(() => vi.advanceTimersByTime(1));
    expect(FonteFalsa.instancias).toHaveLength(2);
    // Segunda queda: espera 2 s.
    act(() => FonteFalsa.instancias[1].emitir('error', FonteFalsa.CLOSED));
    act(() => vi.advanceTimersByTime(2000));
    expect(FonteFalsa.instancias).toHaveLength(3);
    // Conectou: a espera volta a 1 s.
    act(() => FonteFalsa.instancias[2].emitir('open', FonteFalsa.OPEN));
    act(() => FonteFalsa.instancias[2].emitir('error', FonteFalsa.CLOSED));
    act(() => vi.advanceTimersByTime(1000));
    expect(FonteFalsa.instancias).toHaveLength(4);
  });

  it('queda com o navegador reconectando (CONNECTING) não abre outra conexão', () => {
    vi.useFakeTimers();
    renderHook(() => useAvisosDaApi({ base: 'http://api.teste', Fonte }), { wrapper: comCliente });
    act(() => FonteFalsa.instancias[0].emitir('error', FonteFalsa.CONNECTING));
    act(() => vi.advanceTimersByTime(60_000));
    expect(FonteFalsa.instancias).toHaveLength(1);
  });

  it('ao sair da página, fecha a conexão e cancela a reconexão', () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useAvisosDaApi({ base: 'http://api.teste', Fonte }), { wrapper: comCliente });
    act(() => FonteFalsa.instancias[0].emitir('error', FonteFalsa.CLOSED));
    unmount();
    act(() => vi.advanceTimersByTime(60_000));
    expect(FonteFalsa.instancias).toHaveLength(1);
    expect(FonteFalsa.instancias[0].readyState).toBe(FonteFalsa.CLOSED);
  });

  it('a espera dobra até 30 s', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(esperaParaReconectar)).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000]);
  });
});

describe('cliente HTTP único (api.ts)', () => {
  it('monta o endereço com a URL base, sem barra dobrada', () => {
    vi.stubEnv('VITE_API_URL', 'http://api.teste///');
    expect(enderecoNaApi('/v1/catalogo')).toBe('http://api.teste/v1/catalogo');
    vi.stubEnv('VITE_API_URL', '');
    expect(() => enderecoNaApi('/v1/catalogo')).toThrow('VITE_API_URL');
  });

  it('pede JSON com o cookie da sessão e transforma erro em ErroDaApi', async () => {
    const buscar = vi.fn(async () => json({ title: 'Pedidos demais' }, 429));
    vi.stubGlobal('fetch', buscar);
    const erro = await pedirNaApi('/v1/itens', { base: 'http://api.teste' }).catch((e: unknown) => e);
    expect(erro).toBeInstanceOf(ErroDaApi);
    expect(erro).toMatchObject({ status: 429, titulo: 'Pedidos demais', message: 'HTTP 429' });
    expect(buscar).toHaveBeenCalledWith('http://api.teste/v1/itens', expect.objectContaining({ credentials: 'include' }));
  });

  it('converte o catálogo da API para os tipos do painel, com o número da issue no texto', () => {
    expect(trilhasDaApi(catalogo(1))[0].itens.map((i) => [i.texto, i.feito])).toEqual([
      ['Criar a API.', true],
      ['Validar a entrada. (#208)', false],
      ['Documentar.', false],
    ]);
  });
});
