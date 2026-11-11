// T5.4: lê os PRs mesclados na main ou numa sprint (developer/sprint-*) pela API do GitHub e acha o código do item
// no título ("T2.3: ..."). Cada PR vira uma conclusão: o código, o usuário que
// abriu o PR e o link. T5.5: falha do GitHub vira um erro claro, nunca um 500.
import { ErroDaApi } from './erros.mjs';

export const REPOSITORIO_PADRAO = 'learnTECH-community/formacao-dev';
const POR_PAGINA = 100;
const PAGINAS_NO_MAXIMO = 10;

// No fluxo do repositório, o PR do item entra na sprint, e a sprint entra na main.
export const BASE_ACEITA = /^(main|developer\/sprint-[\w-]+)$/;

// Código seguido de dois-pontos: "T5.1: API ... (e T5.6: repositório)" → T5.1 e T5.6.
const CODIGO_NO_TITULO = /\b(T\d+\.\d+):/g;

/** Códigos de item citados no título do PR, sem repetir. */
export function codigosDoTitulo(titulo) {
  return [...new Set([...titulo.matchAll(CODIGO_NO_TITULO)].map((m) => m[1]))];
}

/** PRs mesclados → conclusões, só dos itens que existem no catálogo. */
export function conclusoesDosPrs(prs, existe) {
  return prs
    .filter((pr) => pr.merged_at && BASE_ACEITA.test(pr.base?.ref ?? ''))
    .flatMap((pr) =>
      codigosDoTitulo(pr.title)
        .filter(existe)
        .map((item) => ({ item, usuario: pr.user.login, pr: pr.html_url, concluidaEm: new Date(pr.merged_at).toISOString() })),
    );
}

/** Segundos até o GitHub liberar de novo, pelos cabeçalhos da resposta. */
function segundosParaTentar(resposta, agora) {
  const retry = Number(resposta.headers.get('retry-after'));
  if (Number.isFinite(retry) && retry > 0) return Math.ceil(retry);
  const reset = Number(resposta.headers.get('x-ratelimit-reset'));
  if (Number.isFinite(reset) && reset > 0) return Math.max(1, Math.ceil(reset - agora() / 1000));
  return 60;
}

/**
 * Cliente da API do GitHub. O fetch é injetado: os testes usam um GitHub simulado.
 * @param {object} opcoes
 * @param {typeof fetch} [opcoes.fetch]
 * @param {string} [opcoes.repositorio] "dono/nome".
 * @param {string} [opcoes.token] Opcional (variável GITHUB_TOKEN, do responsável). Nunca vai para o log.
 * @param {number} [opcoes.tempoLimiteMs] Tempo máximo de cada pedido ao GitHub.
 * @param {() => number} [opcoes.agora]
 */
export function criarClienteDoGitHub({ fetch: buscar = fetch, repositorio = REPOSITORIO_PADRAO, token, tempoLimiteMs = 5000, agora = Date.now } = {}) {
  const cabecalhos = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'formacao-dev-api' };
  if (token) cabecalhos.Authorization = `Bearer ${token}`;

  async function pedir(caminho) {
    let resposta;
    try {
      resposta = await buscar(`https://api.github.com${caminho}`, { headers: cabecalhos, signal: AbortSignal.timeout(tempoLimiteMs) });
    } catch (erro) {
      const demorou = erro?.name === 'TimeoutError';
      throw new ErroDaApi(
        'falha-do-github',
        demorou ? `O GitHub não respondeu em ${tempoLimiteMs / 1000} s. As conclusões já gravadas continuam disponíveis.` : 'Não conseguimos falar com o GitHub. As conclusões já gravadas continuam disponíveis.',
      );
    }
    const esgotado = resposta.status === 429 || (resposta.status === 403 && resposta.headers.get('x-ratelimit-remaining') === '0');
    if (esgotado) {
      const segundos = segundosParaTentar(resposta, agora);
      throw new ErroDaApi('github-indisponivel', `O limite de pedidos ao GitHub acabou. Tente de novo em ${segundos} s.`, {
        cabecalhos: { 'Retry-After': String(segundos) },
      });
    }
    if (!resposta.ok) {
      throw new ErroDaApi('falha-do-github', `O GitHub respondeu com erro (HTTP ${resposta.status}). As conclusões já gravadas continuam disponíveis.`);
    }
    return resposta.json();
  }

  return {
    /** PRs fechados e mesclados, página a página, até 1.000. */
    async prsMesclados() {
      const todos = [];
      for (let pagina = 1; pagina <= PAGINAS_NO_MAXIMO; pagina++) {
        const lote = await pedir(`/repos/${repositorio}/pulls?state=closed&per_page=${POR_PAGINA}&page=${pagina}`);
        todos.push(...lote);
        if (lote.length < POR_PAGINA) break;
      }
      return todos.filter((pr) => pr.merged_at);
    },
  };
}

/** Lê os PRs e grava as conclusões. Devolve quantas eram novas e quantas já existiam. */
export async function sincronizar({ github, repositorio, existe }) {
  const conclusoes = conclusoesDosPrs(await github.prsMesclados(), existe);
  const itensNovos = [];
  for (const c of conclusoes) if ((await repositorio.registrarConclusao(c)).criada) itensNovos.push(c.item);
  const novas = itensNovos.length;
  return { lidas: conclusoes.length, novas, repetidas: conclusoes.length - novas, itensNovos: [...new Set(itensNovos)] };
}
