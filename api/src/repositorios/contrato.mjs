// T5.6: a interface do repositório de dados, descrita num lugar só.
// As rotas só conhecem esta interface. Quem cria o app escolhe a implementação:
// memória (testes e estudo) ou banco (T6). Todas as funções são assíncronas,
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
 * @property {(dados: Omit<Conclusao, 'id'>) => Promise<{ conclusao: Conclusao, criada: boolean }>} registrarConclusao
 *   Grava uma conclusão. Se a mesma pessoa já concluiu o mesmo item, devolve a que existia, com criada = false.
 * @property {(filtro?: { item?: string, usuario?: string }) => Promise<Conclusao[]>} listarConclusoes
 *   Conclusões em ordem de id.
 */

/** Funções que toda implementação precisa ter. */
export const FUNCOES_DO_REPOSITORIO = ['saude', 'registrarConclusao', 'listarConclusoes'];

/** Falha cedo, na criação do app, se o repositório não segue a interface. */
export function conferirRepositorio(repositorio) {
  const faltando = FUNCOES_DO_REPOSITORIO.filter((nome) => typeof repositorio?.[nome] !== 'function');
  if (faltando.length) throw new TypeError(`repositório sem as funções: ${faltando.join(', ')}`);
  return repositorio;
}
