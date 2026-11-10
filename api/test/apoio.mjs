// Apoio dos testes: sobe o app numa porta livre e devolve o endereço.
import { criarApp } from '../src/app.mjs';
import { criarRepositorioEmMemoria } from '../src/repositorios/memoria.mjs';

/** Catálogo pequeno e fictício, no mesmo formato do CATALOGO.md. */
export const CATALOGO_DE_TESTE = [
  '# Catálogo de formação',
  '',
  '**Progresso:** 1 de 4 itens',
  '',
  '## T1 · Trilha um',
  '- [x] **T1.1** Primeiro item.',
  '- [ ] **T1.2** Segundo item, com `código`. (#12)',
  '',
  '## T2 · Trilha dois',
  '- [ ] **T2.1** Terceiro item.',
  '- [ ] **T2.2** Quarto item.',
  '',
].join('\n');

/** Conclusão fictícia para os testes. */
export const conclusao = (item, usuario, n = 1) => ({
  item,
  usuario,
  pr: `https://github.com/exemplo/repo/pull/${n}`,
  concluidaEm: '2026-11-10T12:00:00.000Z',
});

/** Log que não escreve nada, para a saída dos testes ficar limpa. */
export const LOG_MUDO = { debug() {}, info() {}, warn() {}, error() {} };

/** Sobe o app com as opções dadas. Sem repositório, usa o de memória. */
export async function subir(opcoes = {}) {
  const repositorio = opcoes.repositorio ?? criarRepositorioEmMemoria();
  const app = criarApp({ lerCatalogo: async () => CATALOGO_DE_TESTE, log: LOG_MUDO, ...opcoes, repositorio });
  const servidor = await new Promise((pronto) => {
    const s = app.listen(0, '127.0.0.1', () => pronto(s));
  });
  const base = `http://127.0.0.1:${servidor.address().port}`;
  return {
    base,
    repositorio,
    fechar: () =>
      new Promise((r) => {
        servidor.closeAllConnections();
        servidor.close(r);
      }),
  };
}
