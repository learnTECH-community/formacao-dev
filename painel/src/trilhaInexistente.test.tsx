// @vitest-environment jsdom
// #348: trilha que não existe no endereço (?trilha=T99). A página avisa, mostra todas e limpa o endereço.
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router';
import { App } from './App';
import { Provedores } from './teste/Provedores';
import { CATALOGO_MD, resposta } from './teste/dados';

function Endereco() {
  const { search } = useLocation();
  return <output data-testid="endereco">{search}</output>;
}

function abrir(endereco: string) {
  return render(
    <Provedores endereco={endereco}>
      <App />
      <Endereco />
    </Provedores>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('trilha inexistente no endereço (#348)', () => {
  it('avisa na região da contagem, mostra todas as trilhas e limpa só a trilha do endereço', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => resposta(CATALOGO_MD)));
    abrir('/?trilha=T99&situacao=feitos');
    const contagem = await screen.findByText(/A trilha T99 não existe; o filtro voltou para todas as trilhas\./);
    expect(contagem).toHaveAttribute('aria-live', 'polite');
    expect(contagem).toHaveTextContent('Mostrando 1 de 3 itens.');
    expect(screen.getByLabelText('Trilha')).toHaveValue('');
    await waitFor(() => expect(screen.getByTestId('endereco')).toHaveTextContent(/^\?situacao=feitos$/));
  });

  it('o aviso some quando a pessoa mexe no filtro', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => resposta(CATALOGO_MD)));
    const pessoa = userEvent.setup();
    abrir('/?trilha=T99');
    await screen.findByText(/A trilha T99 não existe/);
    await pessoa.selectOptions(screen.getByLabelText('Situação'), 'Feitos');
    expect(screen.queryByText(/A trilha T99 não existe/)).toBeNull();
    expect(screen.getByText('Mostrando 1 de 3 itens.')).toBeInTheDocument();
  });

  it('trilha válida não mostra aviso', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => resposta(CATALOGO_MD)));
    abrir('/?trilha=T2');
    await screen.findByText('Mostrando 1 de 3 itens.');
    expect(screen.queryByText(/não existe/)).toBeNull();
  });
});
