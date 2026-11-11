// @vitest-environment jsdom
// T4.5: quantas vezes os itens renderizam numa lista grande (1.000 itens).
// Conta as renderizações pelo TextoDoItem, que só renderiza quando o item renderiza,
// e mede o tempo de cada commit com o Profiler do React.
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import { Profiler, type ProfilerOnRenderCallback } from 'react';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { Provedores } from './teste/Provedores';
import { resposta } from './teste/dados';

const contagem = vi.hoisted(() => ({ itens: 0 }));

vi.mock('./componentes/TextoDoItem', async (original) => {
  const modulo = await original<typeof import('./componentes/TextoDoItem')>();
  return {
    TextoDoItem: (props: { texto: string }) => {
      contagem.itens += 1;
      return modulo.TextoDoItem(props);
    },
  };
});

/** Catálogo gerado: 10 trilhas com 100 itens cada. */
function catalogoGrande(): string {
  const linhas = ['# Catálogo', ''];
  for (let t = 1; t <= 10; t++) {
    linhas.push(`## T${t} · Trilha ${t}`, `Roadmap de referência: [R${t}](https://roadmap.sh/r${t})`, '');
    for (let i = 1; i <= 100; i++) linhas.push(`- [${i % 3 === 0 ? 'x' : ' '}] **T${t}.${i}** Item ${t}.${i} com \`código\`.`);
    linhas.push('');
  }
  return linhas.join('\n');
}

const commits: { fase: string; duracao: number }[] = [];
const aoRenderizar: ProfilerOnRenderCallback = (_id, fase, duracao) => {
  commits.push({ fase, duracao });
};

async function abrirGrande() {
  vi.stubGlobal('fetch', vi.fn(async () => resposta(catalogoGrande())));
  render(
    <Profiler id="painel" onRender={aoRenderizar}>
      <Provedores>
        <App />
      </Provedores>
    </Profiler>,
  );
  await screen.findByText('Mostrando todos os 1000 itens.', {}, { timeout: 10_000 });
}

/** Renderizações de itens e tempo (ms) durante a ação. */
async function medir(acao: () => Promise<void>): Promise<{ itens: number; ms: number }> {
  contagem.itens = 0;
  commits.length = 0;
  await act(acao);
  return { itens: contagem.itens, ms: Math.round(commits.reduce((s, c) => s + c.duracao, 0)) };
}

beforeEach(() => {
  contagem.itens = 0;
  commits.length = 0;
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('renderizações numa lista de 1.000 itens', () => {
  it('a primeira carga renderiza cada item uma vez (sem StrictMode)', async () => {
    await abrirGrande();
    expect(screen.getAllByRole('button', { name: /^Fixar T/ })).toHaveLength(1000);
    expect(contagem.itens).toBe(1000);
  }, 30_000);

  it('trocar o tema não renderiza nenhum item de novo', async () => {
    await abrirGrande();
    const pessoa = userEvent.setup();
    const r = await medir(() => pessoa.click(screen.getByRole('button', { name: 'Tema escuro' })));
    console.info(`[T4.5] trocar o tema: ${r.itens} itens renderizados, ${r.ms} ms`);
    expect(r.itens).toBe(0);
  }, 30_000);

  it('fixar um item renderiza só ele e a cópia dele em "Fixados"', async () => {
    await abrirGrande();
    const pessoa = userEvent.setup();
    const itens = within(screen.getByRole('region', { name: 'Itens' }));
    const r = await medir(() => pessoa.click(itens.getByRole('button', { name: 'Fixar T5.50' })));
    console.info(`[T4.5] fixar um item: ${r.itens} itens renderizados, ${r.ms} ms`);
    expect(r.itens).toBeLessThanOrEqual(2);
  }, 30_000);
});
