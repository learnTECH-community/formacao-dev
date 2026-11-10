// @vitest-environment jsdom
// T4.4: testes dos componentes pelo que a pessoa vê e faz: papel, nome, rótulo e texto.
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { BarraProgresso } from './BarraProgresso';
import { CartaoTrilha } from './CartaoTrilha';
import { Filtros, type FiltroEscolhido } from './Filtros';
import { ItemDoCatalogo } from './ItemDoCatalogo';
import { TRILHAS } from '../teste/dados';

describe('BarraProgresso', () => {
  it('tem nome, valores e o texto equivalente visível', () => {
    render(
      <>
        <p id="rotulo">Progresso do catálogo</p>
        <BarraProgresso idDoRotulo="rotulo" progresso={{ feitos: 3, total: 6, percentual: 50 }} />
      </>,
    );
    const barra = screen.getByRole('progressbar', { name: 'Progresso do catálogo' });
    expect(barra).toHaveAttribute('aria-valuemin', '0');
    expect(barra).toHaveAttribute('aria-valuemax', '6');
    expect(barra).toHaveAttribute('aria-valuenow', '3');
    expect(barra).toHaveAttribute('aria-valuetext', '3 de 6 itens');
    expect(screen.getByText('3 de 6 itens')).toBeVisible();
  });

  it('usa "item" no singular', () => {
    render(
      <>
        <p id="r">Uma trilha</p>
        <BarraProgresso idDoRotulo="r" progresso={{ feitos: 0, total: 1, percentual: 0 }} />
      </>,
    );
    expect(screen.getByRole('progressbar', { name: 'Uma trilha' })).toHaveAttribute('aria-valuetext', '0 de 1 item');
    expect(screen.getByText('0 de 1 item')).toBeInTheDocument();
  });
});

describe('ItemDoCatalogo', () => {
  it('mostra o código, o texto e a situação escrita', () => {
    render(
      <ul>
        <ItemDoCatalogo item={TRILHAS[0].itens[0]} />
        <ItemDoCatalogo item={TRILHAS[0].itens[1]} />
      </ul>,
    );
    const [feito, aFazer] = screen.getAllByRole('listitem');
    expect(within(feito).getByText('T1.1')).toBeInTheDocument();
    expect(within(feito).getByText('Feito')).toBeInTheDocument();
    expect(within(aFazer).getByText('A fazer')).toBeInTheDocument();
    expect(within(aFazer).getByText('Abrir uma issue.')).toBeInTheDocument();
  });

  it('o trecho entre crases vira código, e HTML do catálogo continua texto', () => {
    render(
      <ul>
        <ItemDoCatalogo item={{ codigo: 'T0.1', texto: '<img src=x onerror="alert(1)"> e `<b>negrito</b>`', feito: false }} />
      </ul>,
    );
    const item = screen.getByRole('listitem');
    expect(item).toHaveTextContent('<img src=x onerror="alert(1)">');
    expect(within(item).getByText('<b>negrito</b>').tagName).toBe('CODE');
    expect(within(item).queryByRole('img')).toBeNull();
  });
});

describe('CartaoTrilha', () => {
  it('tem o título com link para o detalhe, a barra com o nome da trilha e os links do roadmap.sh', () => {
    render(
      <MemoryRouter>
        <ol>
          <CartaoTrilha trilha={TRILHAS[1]} />
        </ol>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 3, name: 'T2 Frontend base' })).toBeInTheDocument();
    const barra = screen.getByRole('progressbar', { name: 'T2 Frontend base' });
    expect(barra).toHaveAttribute('aria-valuetext', '0 de 1 item');
    expect(screen.getByRole('link', { name: 'T2 Frontend base' })).toHaveAttribute('href', '/trilha/T2');
    expect(screen.getByRole('link', { name: 'Frontend' })).toHaveAttribute('href', 'https://roadmap.sh/frontend');
    expect(screen.getByRole('link', { name: 'CSS' })).toHaveAttribute('href', 'https://roadmap.sh/css');
  });
});

describe('Filtros', () => {
  const inicial: FiltroEscolhido = { trilha: '', situacao: 'todos' };

  it('tem rótulos e uma opção por trilha, além de "Todas as trilhas"', () => {
    render(<Filtros trilhas={TRILHAS} filtro={inicial} ligado aoMudar={() => {}} />);
    expect(screen.getByRole('form', { name: 'Filtrar itens' })).toBeInTheDocument();
    const trilha = screen.getByLabelText('Trilha');
    expect(within(trilha).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Todas as trilhas',
      'T1 · Git e GitHub',
      'T2 · Frontend base',
    ]);
    expect(screen.getByLabelText('Situação')).toHaveValue('todos');
  });

  it('avisa a escolha da trilha e da situação', async () => {
    const pessoa = userEvent.setup();
    const aoMudar = vi.fn();
    render(<Filtros trilhas={TRILHAS} filtro={inicial} ligado aoMudar={aoMudar} />);
    await pessoa.selectOptions(screen.getByLabelText('Trilha'), 'T2 · Frontend base');
    expect(aoMudar).toHaveBeenLastCalledWith({ trilha: 'T2', situacao: 'todos' });
    await pessoa.selectOptions(screen.getByLabelText('Situação'), 'A fazer');
    expect(aoMudar).toHaveBeenLastCalledWith({ trilha: '', situacao: 'a-fazer' });
  });

  it('desligado, não deixa escolher', () => {
    render(<Filtros trilhas={[]} filtro={inicial} ligado={false} aoMudar={() => {}} />);
    expect(screen.getByLabelText('Trilha')).toBeDisabled();
    expect(screen.getByLabelText('Situação')).toBeDisabled();
  });
});
