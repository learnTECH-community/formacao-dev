// T5.6: a interface do repositório de dados, descrita num lugar só.
// As rotas só conhecem esta interface. Quem cria o app escolhe a implementação:
// memória (testes e estudo) ou SQLite (T6.6). Todas as funções são assíncronas,
// para valer também para um banco remoto.

/**
 * @typedef {object} Conclusao
 * @property {number} id
 * @property {string} item        Código do item, como "T2.3".
 * @property {string} usuario     Nome de usuário do GitHub.
 * @property {string} pr          Link do PR que fez o item.
 * @property {string} concluidaEm Data e hora em ISO 8601.
 */

/**
 * @typedef {object} Repositorio
 * @property {() => Promise<{ conclusoes: number }>} saude
 *   Lê o armazenamento de verdade (usado pelo /health).
 * @property {(trilhas: { codigo: string, nome: string, itens: { codigo: string, texto: string, feito: boolean }[] }[]) => Promise<void>} gravarCatalogo
 *   Guarda as trilhas e os itens lidos do CATALOGO.md (o banco precisa deles para as chaves estrangeiras).
 * @property {(dados: Omit<Conclusao, 'id'>) => Promise<{ conclusao: Conclusao, criada: boolean }>} registrarConclusao
 *   Grava uma conclusão. Se a mesma pessoa já concluiu o mesmo item, devolve a que existia, com criada = false.
 *   Garantido também com pedidos simultâneos (T6.5).
 * @property {(filtro?: { item?: string, usuario?: string }) => Promise<Conclusao[]>} listarConclusoes
 *   Conclusões em ordem de id.
 * @property {(id: number) => Promise<Conclusao | null>} obterConclusao
 * @property {(id: number, mudanca: { pr: string }) => Promise<Conclusao | null>} atualizarConclusao
 *   Troca o link do PR. Devolve null se o id não existe.
 * @property {(id: number) => Promise<boolean>} apagarConclusao
 *   Apaga de verdade (decisão em docs/banco.md). Devolve false se o id não existe.
 */

/** Funções que toda implementação precisa ter. */
export const FUNCOES_DO_REPOSITORIO = [
  'saude',
  'gravarCatalogo',
  'registrarConclusao',
  'listarConclusoes',
  'obterConclusao',
  'atualizarConclusao',
  'apagarConclusao',
];

/** Falha cedo, na criação do app, se o repositório não segue a interface. */
export function conferirRepositorio(repositorio) {
  const faltando = FUNCOES_DO_REPOSITORIO.filter((nome) => typeof repositorio?.[nome] !== 'function');
  if (faltando.length) throw new TypeError(`repositório sem as funções: ${faltando.join(', ')}`);
  return repositorio;
}
