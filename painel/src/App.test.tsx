// @vitest-environment jsdom
// T7.4: o app com o fetch simulado: falha de rede, HTTP 500, catálogo vazio e nova tentativa.
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { App } from './App';
import { PreferenciasProvider } from './estado/PreferenciasProvider';
import { CATALOGO_MD, CATALOGO_VAZIO, resposta } from './teste/dados';

function abrir(endereco = '/') {
  return render(
    <PreferenciasProvider>
      <MemoryRouter initialEntries={[endereco]}>
        <App />
      </MemoryRouter>
    </PreferenciasProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('App', () => {
  it('mostra as trilhas, o total e os filtros ligados quando o catálogo chega', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => resposta(CATALOGO_MD)));
    abrir();
    expect(screen.getByRole('status')).toHaveTextContent('Carregando o catálogo…');
    expect(screen.getByLabelText('Trilha')).toBeDisabled();
    expect(await screen.findByRole('progressbar', { name: 'Progresso do catálogo' })).toHaveAttribute('aria-valuetext', '1 de 3 itens');
    const trilhas = within(screen.getByRole('region', { name: 'Trilhas' }));
    expect(trilhas.getByRole('heading', { level: 3, name: 'T1 Git e GitHub' })).toBeInTheDocument();
    expect(screen.getByLabelText('Trilha')).toBeEnabled();
    expect(screen.getByText('Mostrando todos os 3 itens.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('falha de rede: mostra o alerta, e "Tentar de novo" carrega e leva o foco às trilhas', async () => {
    const falso = vi.fn(async (): Promise<Response> => {
      throw new TypeError('Failed to fetch');
    });
    vi.stubGlobal('fetch', falso);
    const pessoa = userEvent.setup();
    abrir();
    const alerta = await screen.findByRole('alert');
    expect(await screen.findByText('Não foi possível carregar o catálogo.')).toBeInTheDocument();
    expect(alerta).toHaveTextContent('Confira a conexão.');
    expect(screen.queryAllByRole('progressbar')).toEqual([]);

    falso.mockImplementation(async () => resposta(CATALOGO_MD));
    await pessoa.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    const trilhas = within(screen.getByRole('region', { name: 'Trilhas' }));
    expect(await trilhas.findByRole('heading', { level: 3, name: 'T2 Frontend base' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole('heading', { level: 2, name: 'Trilhas' })).toHaveFocus());
    expect(screen.getByRole('alert')).toBeEmptyDOMElement();
  });

  it('HTTP 500: o alerta diz o código', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => resposta('erro', 500)));
    abrir();
    expect(await screen.findByText(/HTTP 500/)).toBeInTheDocument();
  });

  it('catálogo vazio: avisa e deixa os filtros desligados', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => resposta(CATALOGO_VAZIO)));
    abrir();
    expect(await screen.findByText(/O catálogo ainda não tem itens/)).toBeInTheDocument();
    expect(screen.getByLabelText('Situação')).toBeDisabled();
    expect(screen.queryAllByRole('progressbar')).toEqual([]);
  });

  it('filtrar pela situação muda a lista e a contagem', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => resposta(CATALOGO_MD)));
    const pessoa = userEvent.setup();
    abrir();
    await screen.findByText('Mostrando todos os 3 itens.');
    await pessoa.selectOptions(screen.getByLabelText('Situação'), 'Feitos');
    expect(screen.getByText('Mostrando 1 de 3 itens.')).toBeInTheDocument();
    expect(screen.queryByText('Abrir uma issue.')).toBeNull();
  });
});

describe('rotas (T4.3)', () => {
  it('/trilha/T2 mostra o detalhe da trilha, com título da aba', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => resposta(CATALOGO_MD)));
    abrir('/trilha/T2');
    expect(await screen.findByRole('heading', { level: 2, name: 'T2 Frontend base' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'T2 Frontend base' })).toHaveAttribute('aria-valuetext', '0 de 1 item');
    expect(screen.getByText('Montar a página.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao painel' })).toHaveAttribute('href', '/');
    // O título da aba muda num efeito, depois da renderização: esperar, não ler na hora.
    await waitFor(() => expect(document.title).toBe('T2 Frontend base · Painel de Formação · learnTECH Community'));
  });

  it('trilha que não existe mostra "Trilha não encontrada"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => resposta(CATALOGO_MD)));
    abrir('/trilha/T99');
    expect(await screen.findByRole('heading', { level: 2, name: 'Trilha não encontrada' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar ao painel' })).toBeInTheDocument();
  });

  it('o link da trilha abre o detalhe e leva o foco ao título', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => resposta(CATALOGO_MD)));
    const pessoa = userEvent.setup();
    abrir();
    await pessoa.click(await screen.findByRole('link', { name: 'T1 Git e GitHub' }));
    expect(screen.getByRole('heading', { level: 2, name: 'T1 Git e GitHub' })).toHaveFocus();
    await pessoa.click(screen.getByRole('link', { name: 'Voltar ao painel' }));
    expect(screen.getByRole('heading', { level: 2, name: 'Trilhas' })).toHaveFocus();
  });

  it('endereço desconhecido mostra "Página não encontrada"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => resposta(CATALOGO_MD)));
    abrir('/qualquer');
    expect(await screen.findByRole('heading', { level: 2, name: 'Página não encontrada' })).toBeInTheDocument();
  });
});
