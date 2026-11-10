// @vitest-environment jsdom
// T6.9: a tabela "Quem mais concluiu" usa o resultado de GET /v1/ranking.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { Provedores } from '../teste/Provedores';
import { Ranking, type LinhaDoRanking } from './Ranking';

const RANKING: LinhaDoRanking[] = [
  { posicao: 1, usuario: 'pessoa-c', concluidos: 3, empatado: false },
  { posicao: 2, usuario: 'pessoa-a', concluidos: 2, empatado: true },
  { posicao: 2, usuario: 'pessoa-b', concluidos: 2, empatado: true },
  { posicao: 4, usuario: 'pessoa-d', concluidos: 1, empatado: false },
];
const json = (corpo: unknown, status = 200) => new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } });
const abrir = (base?: string) =>
  render(
    <Provedores>
      <Ranking base={base} />
    </Provedores>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('Ranking', () => {
  it('mostra a tabela com posição, pessoa e itens, e marca o empate', async () => {
    const buscar = vi.fn(async () => json({ ranking: RANKING }));
    vi.stubGlobal('fetch', buscar);
    abrir('http://api.teste');
    const tabela = await screen.findByRole('table', { name: /primeiras posições/ });
    const linhas = within(tabela).getAllByRole('row').slice(1);
    expect(linhas.map((l) => within(l).getAllByRole('cell').map((c) => c.textContent))).toEqual([
      ['1º', '3'],
      ['2º (empate)', '2'],
      ['2º (empate)', '2'],
      ['4º', '1'],
    ]);
    expect(within(linhas[1]).getByRole('rowheader')).toHaveTextContent('pessoa-a');
    expect(within(linhas[0]).getByRole('link', { name: 'pessoa-c' })).toHaveAttribute('href', 'https://github.com/pessoa-c');
    expect(buscar).toHaveBeenCalledWith('http://api.teste/v1/ranking', expect.objectContaining({ credentials: 'include' }));
  });

  it('sem conclusões, diz que ninguém concluiu ainda', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ ranking: [] })));
    abrir('http://api.teste');
    expect(await screen.findByText('Ninguém concluiu um item ainda.')).toBeInTheDocument();
  });

  it('com a API fora, mostra o alerta', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => json({ title: 'Erro interno' }, 500)));
    abrir('http://api.teste');
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar o ranking.');
  });

  it('sem a API configurada, não aparece e não pede nada', () => {
    const buscar = vi.fn();
    vi.stubGlobal('fetch', buscar);
    const { container } = abrir(undefined);
    expect(container).toBeEmptyDOMElement();
    expect(buscar).not.toHaveBeenCalled();
  });
});
