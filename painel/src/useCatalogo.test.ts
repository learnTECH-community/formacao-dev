// @vitest-environment jsdom
// T4.7, T7.4 e T4.11: o hook useCatalogo contra um servidor simulado (msw):
// resposta ok, erro, vazio, demora, cancelamento, novas tentativas e cache.
import { afterAll, afterEach, beforeAll, describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { http, HttpResponse, delay } from 'msw';
import { setupServer } from 'msw/node';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deveTentarDeNovo } from './consultas';
import { mensagemDeErro, useCatalogo, useTrilha } from './useCatalogo';
import { CATALOGO_MD, CATALOGO_VAZIO } from './teste/dados';
import { clienteDeTeste } from './teste/cliente';

const ENDERECO = 'http://localhost:3000/CATALOGO.md';
const servidor = setupServer();
let pedidos = 0;
servidor.events.on('request:start', () => {
  pedidos += 1;
});

beforeAll(() => servidor.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  servidor.resetHandlers();
  pedidos = 0;
});
afterAll(() => servidor.close());

const markdown = (corpo: string) => new HttpResponse(corpo, { headers: { 'Content-Type': 'text/markdown' } });

function comCliente(cliente: QueryClient = clienteDeTeste()) {
  return ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: cliente }, children);
}

function abrirHook(cliente?: QueryClient) {
  return renderHook(() => useCatalogo(ENDERECO), { wrapper: comCliente(cliente) });
}

describe('useCatalogo', () => {
  it('começa carregando e fica pronto com as trilhas', async () => {
    servidor.use(http.get(ENDERECO, () => markdown(CATALOGO_MD)));
    const { result } = abrirHook();
    expect(result.current.situacao).toBe('carregando');
    await waitFor(() => expect(result.current.situacao).toBe('pronto'));
    if (result.current.situacao !== 'pronto') throw new Error('esperava pronto');
    expect(result.current.trilhas.map((t) => t.codigo)).toEqual(['T1', 'T2']);
  });

  it('HTTP 500 vira erro com o código, sem nova tentativa', async () => {
    servidor.use(http.get(ENDERECO, () => new HttpResponse('erro', { status: 500 })));
    const { result } = abrirHook();
    await waitFor(() => expect(result.current.situacao).toBe('erro'));
    if (result.current.situacao !== 'erro') throw new Error('esperava erro');
    expect(mensagemDeErro(result.current.erro)).toBe('O servidor respondeu com erro (HTTP 500).');
    expect(pedidos).toBe(1);
  });

  it('falha de rede: até duas novas tentativas, depois o erro com a mensagem de conexão', async () => {
    servidor.use(http.get(ENDERECO, () => HttpResponse.error()));
    const { result } = abrirHook();
    await waitFor(() => expect(result.current.situacao).toBe('erro'));
    if (result.current.situacao !== 'erro') throw new Error('esperava erro');
    expect(mensagemDeErro(result.current.erro)).toBe('Não conseguimos falar com o servidor. Confira a conexão.');
    expect(pedidos).toBe(3); // 1 pedido + 2 novas tentativas
  });

  it('falha de rede que passa na segunda tentativa mostra o catálogo', async () => {
    let vez = 0;
    servidor.use(http.get(ENDERECO, () => (++vez === 1 ? HttpResponse.error() : markdown(CATALOGO_MD))));
    const { result } = abrirHook();
    await waitFor(() => expect(result.current.situacao).toBe('pronto'));
    expect(pedidos).toBe(2);
  });

  it('catálogo sem itens vira vazio', async () => {
    servidor.use(http.get(ENDERECO, () => markdown(CATALOGO_VAZIO)));
    const { result } = abrirHook();
    await waitFor(() => expect(result.current.situacao).toBe('vazio'));
  });

  it('enquanto a resposta demora, segue carregando', async () => {
    servidor.use(
      http.get(ENDERECO, async () => {
        await delay(300);
        return markdown(CATALOGO_MD);
      }),
    );
    const { result } = abrirHook();
    await new Promise((r) => setTimeout(r, 100));
    expect(result.current.situacao).toBe('carregando');
    await waitFor(() => expect(result.current.situacao).toBe('pronto'));
  });

  it('cancela o pedido ao desmontar e não muda o estado depois', async () => {
    let sinal: AbortSignal | undefined;
    servidor.use(
      http.get(ENDERECO, async ({ request }) => {
        sinal = request.signal;
        await delay('infinite');
        return markdown(CATALOGO_MD);
      }),
    );
    const erroNoConsole = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = abrirHook();
    await waitFor(() => expect(sinal).toBeDefined());
    expect(sinal?.aborted).toBe(false);
    unmount();
    await waitFor(() => expect(sinal?.aborted).toBe(true));
    expect(erroNoConsole).not.toHaveBeenCalled();
    erroNoConsole.mockRestore();
  });

  it('"tentar de novo" volta a carregar e busca outra vez', async () => {
    let falhar = true;
    servidor.use(
      http.get(ENDERECO, async () => {
        if (falhar) return new HttpResponse('erro', { status: 503 });
        await delay(200);
        return markdown(CATALOGO_MD);
      }),
    );
    const { result } = abrirHook();
    await waitFor(() => expect(result.current.situacao).toBe('erro'));
    falhar = false;
    act(() => result.current.tentarDeNovo());
    await waitFor(() => expect(result.current.situacao).toBe('carregando'));
    await waitFor(() => expect(result.current.situacao).toBe('pronto'));
    expect(pedidos).toBe(2);
  });

  it('ao voltar à página, o catálogo em cache aparece sem nova tela de carregamento (T4.11)', async () => {
    servidor.use(http.get(ENDERECO, () => markdown(CATALOGO_MD)));
    const cliente = clienteDeTeste();
    const primeira = abrirHook(cliente);
    await waitFor(() => expect(primeira.result.current.situacao).toBe('pronto'));
    primeira.unmount();
    const volta = abrirHook(cliente);
    expect(volta.result.current.situacao).toBe('pronto'); // já na primeira renderização
    expect(pedidos).toBe(1); // dentro do staleTime, sem pedir de novo
  });
});

describe('useTrilha (T4.11)', () => {
  it('cada trilha tem a própria chave de consulta e lê o catálogo do cache', async () => {
    servidor.use(http.get(ENDERECO, () => markdown(CATALOGO_MD)));
    const cliente = clienteDeTeste();
    const t2 = renderHook(() => useTrilha('T2', ENDERECO), { wrapper: comCliente(cliente) });
    await waitFor(() => expect(t2.result.current?.nome).toBe('Frontend base'));
    const t9 = renderHook(() => useTrilha('T9', ENDERECO), { wrapper: comCliente(cliente) });
    await waitFor(() => expect(t9.result.current).toBeNull());
    const chaves = cliente.getQueryCache().getAll().map((q) => q.queryKey.slice(0, 3).join('/'));
    expect(chaves).toEqual(expect.arrayContaining(['catalogo/trilha/T2', 'catalogo/trilha/T9']));
    expect(pedidos).toBe(1);
  });
});

describe('deveTentarDeNovo', () => {
  it('só em falha de rede, no máximo duas vezes', () => {
    expect(deveTentarDeNovo(0, new TypeError('Failed to fetch'))).toBe(true);
    expect(deveTentarDeNovo(1, new TypeError('Failed to fetch'))).toBe(true);
    expect(deveTentarDeNovo(2, new TypeError('Failed to fetch'))).toBe(false);
    expect(deveTentarDeNovo(0, new Error('HTTP 500'))).toBe(false);
  });
});

describe('quem busca o catálogo', () => {
  it('só o useCatalogo e o cliente da API (api.ts) chamam fetch; os componentes usam os hooks', () => {
    const pasta = join(process.cwd(), 'painel/src'); // no jsdom, import.meta.url não é file://
    const arquivos = readdirSync(pasta, { recursive: true, encoding: 'utf8' })
      .map((f) => f.replaceAll('\\', '/'))
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.startsWith('teste/'));
    const comFetch = arquivos.filter((f) => /\bfetch\(/.test(readFileSync(`${pasta}/${f}`, 'utf8')));
    expect(comFetch.sort()).toEqual(['api.ts', 'useCatalogo.ts']);
  });
});
