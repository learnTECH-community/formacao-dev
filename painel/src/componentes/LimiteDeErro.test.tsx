// @vitest-environment jsdom
// T4.13: um erro num cartão de trilha não derruba a página.
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { App } from '../App';
import { PreferenciasProvider } from '../estado/PreferenciasProvider';
import { CATALOGO_MD, resposta } from '../teste/dados';

// A barra da trilha T1 quebra enquanto `quebrar.sim` for verdadeiro.
const quebrar = vi.hoisted(() => ({ sim: true }));
vi.mock('./BarraProgresso', async (original) => {
  const modulo = await original<typeof import('./BarraProgresso')>();
  return {
    BarraProgresso: (props: Parameters<typeof modulo.BarraProgresso>[0]) => {
      if (quebrar.sim && props.idDoRotulo === 'nome-t1') throw new Error('barra quebrada de propósito');
      return modulo.BarraProgresso(props);
    },
  };
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  quebrar.sim = true;
});

async function abrir() {
  vi.stubGlobal('fetch', vi.fn(async () => resposta(CATALOGO_MD)));
  render(
    <PreferenciasProvider>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </PreferenciasProvider>,
  );
  return within(await screen.findByRole('region', { name: 'Trilhas' }));
}

describe('LimiteDeErro', () => {
  it('o cartão com erro mostra o aviso; o resto da página continua', async () => {
    const erroNoConsole = vi.spyOn(console, 'error').mockImplementation(() => {});
    const trilhas = await abrir();
    const aviso = await trilhas.findByRole('alert');
    expect(aviso).toHaveTextContent('Não foi possível mostrar a trilha T1.');
    // A outra trilha, o total e a lista de itens seguem na tela.
    expect(trilhas.getByRole('progressbar', { name: 'T2 Frontend base' })).toBeInTheDocument();
    expect(screen.getByRole('progressbar', { name: 'Progresso do catálogo' })).toBeInTheDocument();
    expect(screen.getByText('Mostrando todos os 3 itens.')).toBeInTheDocument();
    // O erro foi registrado no console.
    expect(erroNoConsole.mock.calls.some((c) => String(c[0]).includes('erro ao mostrar a trilha T1'))).toBe(true);
  });

  it('"Tentar de novo" desenha o cartão quando o erro passa', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const pessoa = userEvent.setup();
    const trilhas = await abrir();
    const aviso = await trilhas.findByRole('alert');
    quebrar.sim = false;
    await pessoa.click(within(aviso).getByRole('button', { name: 'Tentar de novo' }));
    expect(trilhas.queryByRole('alert')).toBeNull();
    expect(trilhas.getByRole('progressbar', { name: 'T1 Git e GitHub' })).toBeInTheDocument();
  });
});
