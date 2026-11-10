// @vitest-environment jsdom
// T4.12: envio válido e inválido do formulário "Propor item".
import { afterEach, describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { ProporItem } from './ProporItem';
import { TRILHAS } from '../teste/dados';

afterEach(() => {
  vi.unstubAllGlobals();
});

function abrir() {
  const falso = vi.fn();
  vi.stubGlobal('fetch', falso); // o formulário não pode buscar nada
  render(
    <MemoryRouter>
      <ProporItem catalogo={{ situacao: 'pronto', trilhas: TRILHAS }} pedidoDeFoco={0} />
    </MemoryRouter>,
  );
  return falso;
}

describe('ProporItem', () => {
  it('envio inválido: cada erro aparece ligado ao campo e o foco vai ao primeiro', async () => {
    const pessoa = userEvent.setup();
    abrir();
    await pessoa.click(screen.getByRole('button', { name: 'Montar o link da issue' }));
    const trilha = screen.getByLabelText('Trilha do catálogo');
    expect(trilha).toHaveFocus();
    expect(trilha).toHaveAttribute('aria-invalid', 'true');
    expect(trilha).toHaveAccessibleDescription('A trilha em que o item entra. Escolha a trilha do catálogo.');
    expect(screen.getByLabelText('Critérios de entrega')).toHaveAccessibleDescription(
      'De 3 a 5, verificáveis, um por linha. Escreva de 3 a 5 critérios, um por linha.',
    );
    expect(screen.queryByRole('link', { name: 'Abrir a issue no GitHub' })).toBeNull();
  });

  it('envio válido: monta o link do GitHub e não envia nada', async () => {
    const pessoa = userEvent.setup();
    const falso = abrir();
    await pessoa.selectOptions(screen.getByLabelText('Trilha do catálogo'), 'T2 · Frontend base');
    // O link do roadmap.sh da trilha é sugerido.
    expect(screen.getByLabelText('Trilha do roadmap.sh (link)')).toHaveValue('https://roadmap.sh/frontend');
    await pessoa.type(screen.getByLabelText('Nome do tópico no roadmap.sh'), 'Web Components');
    await pessoa.type(screen.getByLabelText('Tarefa no painel'), 'Criar um web component para a barra de progresso.');
    await pessoa.type(screen.getByLabelText('Critérios de entrega'), 'Usa customElements{Enter}Tem teste{Enter}Passa no axe');
    await pessoa.click(screen.getByRole('button', { name: 'Montar o link da issue' }));

    const link = within(screen.getByRole('status')).getByRole('link', { name: 'Abrir a issue no GitHub' });
    const url = new URL(link.getAttribute('href') ?? '');
    expect(url.hostname).toBe('github.com');
    expect(url.searchParams.get('template')).toBe('novo-item.yml');
    expect(url.searchParams.get('trilha')).toBe('T2');
    expect(url.searchParams.get('topico')).toBe('Web Components');
    expect(screen.getByLabelText('Tarefa no painel')).toHaveAttribute('aria-invalid', 'false');
    expect(falso).not.toHaveBeenCalled();
  });
});
