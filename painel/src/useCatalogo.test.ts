// @vitest-environment jsdom
// T4.7 e T7.4: o hook useCatalogo com o fetch simulado: resposta ok, erro, vazio e demora.
import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { mensagemDeErro, useCatalogo } from './useCatalogo';
import { CATALOGO_MD, CATALOGO_VAZIO, resposta } from './teste/dados';

function simularFetch(implementacao: (endereco: string, opcoes?: RequestInit) => Promise<Response>) {
  const falso = vi.fn(implementacao);
  vi.stubGlobal('fetch', falso);
  return falso;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useCatalogo', () => {
  it('começa carregando e fica pronto com as trilhas', async () => {
    simularFetch(async () => resposta(CATALOGO_MD));
    const { result } = renderHook(() => useCatalogo('CATALOGO.md'));
    expect(result.current.situacao).toBe('carregando');
    await waitFor(() => expect(result.current.situacao).toBe('pronto'));
    if (result.current.situacao !== 'pronto') throw new Error('esperava pronto');
    expect(result.current.trilhas.map((t) => t.codigo)).toEqual(['T1', 'T2']);
  });

  it('HTTP 500 vira erro com o código', async () => {
    simularFetch(async () => resposta('erro', 500));
    const { result } = renderHook(() => useCatalogo());
    await waitFor(() => expect(result.current.situacao).toBe('erro'));
    if (result.current.situacao !== 'erro') throw new Error('esperava erro');
    expect(mensagemDeErro(result.current.erro)).toBe('O servidor respondeu com erro (HTTP 500).');
  });

  it('falha de rede vira erro com a mensagem de conexão', async () => {
    simularFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    const { result } = renderHook(() => useCatalogo());
    await waitFor(() => expect(result.current.situacao).toBe('erro'));
    if (result.current.situacao !== 'erro') throw new Error('esperava erro');
    expect(mensagemDeErro(result.current.erro)).toBe('Não conseguimos falar com o servidor. Confira a conexão.');
  });

  it('catálogo sem itens vira vazio', async () => {
    simularFetch(async () => resposta(CATALOGO_VAZIO));
    const { result } = renderHook(() => useCatalogo());
    await waitFor(() => expect(result.current.situacao).toBe('vazio'));
  });

  it('enquanto a resposta demora, segue carregando', async () => {
    let responder: (r: Response) => void = () => {};
    simularFetch(() => new Promise<Response>((r) => (responder = r)));
    const { result } = renderHook(() => useCatalogo());
    await new Promise((r) => setTimeout(r, 50));
    expect(result.current.situacao).toBe('carregando');
    await act(async () => responder(resposta(CATALOGO_MD)));
    await waitFor(() => expect(result.current.situacao).toBe('pronto'));
  });

  it('cancela o pedido ao desmontar e não muda o estado depois', async () => {
    let sinal: AbortSignal | undefined;
    simularFetch((_endereco, opcoes) => {
      sinal = opcoes?.signal ?? undefined;
      return new Promise<Response>((_r, falhar) => sinal?.addEventListener('abort', () => falhar(new DOMException('cancelado', 'AbortError'))));
    });
    const erroNoConsole = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { unmount } = renderHook(() => useCatalogo());
    expect(sinal?.aborted).toBe(false);
    unmount();
    expect(sinal?.aborted).toBe(true);
    await new Promise((r) => setTimeout(r, 20));
    expect(erroNoConsole).not.toHaveBeenCalled();
    erroNoConsole.mockRestore();
  });

  it('"tentar de novo" volta a carregar e busca outra vez', async () => {
    const falso = simularFetch(async () => {
      throw new TypeError('Failed to fetch');
    });
    const { result } = renderHook(() => useCatalogo());
    await waitFor(() => expect(result.current.situacao).toBe('erro'));
    falso.mockImplementation(async () => resposta(CATALOGO_MD));
    act(() => result.current.tentarDeNovo());
    expect(result.current.situacao).toBe('carregando');
    await waitFor(() => expect(result.current.situacao).toBe('pronto'));
    expect(falso).toHaveBeenCalledTimes(2);
  });
});

describe('quem busca o catálogo', () => {
  it('só o useCatalogo chama fetch; os componentes usam o hook', () => {
    const pasta = join(process.cwd(), 'painel/src'); // no jsdom, import.meta.url não é file://
    const arquivos = readdirSync(pasta, { recursive: true, encoding: 'utf8' })
      .map((f) => f.replaceAll('\\', '/'))
      .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.startsWith('teste/'));
    const comFetch = arquivos.filter((f) => /\bfetch\(/.test(readFileSync(`${pasta}/${f}`, 'utf8')));
    expect(comFetch).toEqual(['useCatalogo.ts']);
  });
});
