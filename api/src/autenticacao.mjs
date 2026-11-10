// T5.13: entrar com a conta do GitHub (OAuth), com sessão em cookie.
// T5.14: papéis "pessoa" e "mantenedor", checados no servidor.
//
// Fluxo:
//   GET  /v1/auth/entrar  → guarda um "state" aleatório num cookie e manda ao GitHub
//   GET  /v1/auth/retorno → confere o state (contra CSRF), troca o code por um token,
//                           lê o login, cria a sessão no servidor e põe o cookie "sessao"
//   POST /v1/auth/sair    → apaga a sessão no servidor e o cookie
//   GET  /v1/auth/eu      → quem está na sessão
// O token do GitHub é usado uma vez (para ler o login) e descartado: a API não o guarda.
// Segredos só por variável de ambiente (nomes no api/.env.example).
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { ErroDaApi } from './erros.mjs';

export const COOKIE_DA_SESSAO = 'sessao';
export const COOKIE_DO_STATE = 'oauth_state';
const HORAS_DA_SESSAO = 8;
const MINUTOS_DO_STATE = 10;

/** Lê o cabeçalho Cookie sem dependência: "a=1; b=2" → { a: '1', b: '2' }. */
export function lerCookies(cabecalho = '') {
  return Object.fromEntries(
    cabecalho
      .split(';')
      .map((p) => p.trim())
      .filter((p) => p.includes('='))
      .map((p) => {
        const i = p.indexOf('=');
        return [p.slice(0, i), decodeURIComponent(p.slice(i + 1))];
      }),
  );
}

/** Opções de cookie: HttpOnly (o JavaScript da página não lê), Secure (só HTTPS ou localhost) e SameSite=Lax. */
const OPCOES_DO_COOKIE = { httpOnly: true, secure: true, sameSite: 'lax', path: '/v1' };

const iguais = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/** Configuração lida do ambiente. Sem id e segredo, o login fica desligado (503), e o resto da API funciona. */
export function configDoAmbiente(ambiente = process.env) {
  return {
    clienteId: ambiente.GITHUB_CLIENT_ID || undefined,
    segredo: ambiente.GITHUB_CLIENT_SECRET || undefined,
    urlDeRetorno: ambiente.URL_DE_RETORNO || 'http://127.0.0.1:4320/v1/auth/retorno',
    urlDoPainel: ambiente.URL_DO_PAINEL || 'http://127.0.0.1:4317/',
    mantenedores: (ambiente.MANTENEDORES ?? '')
      .split(',')
      .map((m) => m.trim().toLowerCase())
      .filter(Boolean),
  };
}

/** Sessões no servidor, em memória. Reiniciar a API encerra todas. */
export function criarSessoes({ agora = Date.now, horas = HORAS_DA_SESSAO } = {}) {
  const sessoes = new Map();
  return {
    criar(usuario, papel) {
      const id = randomBytes(32).toString('base64url');
      sessoes.set(id, { usuario, papel, expiraEm: agora() + horas * 3_600_000 });
      return id;
    },
    ler(id) {
      const s = id && sessoes.get(id);
      if (!s) return null;
      if (agora() >= s.expiraEm) {
        sessoes.delete(id);
        return null;
      }
      return { usuario: s.usuario, papel: s.papel };
    },
    apagar(id) {
      return sessoes.delete(id);
    },
    get tamanho() {
      return sessoes.size;
    },
  };
}

/** Middleware: põe a sessão (ou null) em pedido.sessao. */
export function lerSessao(sessoes) {
  return (pedido, _resposta, seguir) => {
    pedido.sessao = sessoes.ler(lerCookies(pedido.get('cookie'))[COOKIE_DA_SESSAO]);
    seguir();
  };
}

/** T5.14: exige sessão (401) e, se pedido, um papel (403). A checagem é no servidor. */
export function exigirPapel(papel) {
  return (pedido, _resposta, seguir) => {
    if (!pedido.sessao) return seguir(new ErroDaApi('nao-autenticado', 'Entre com a conta do GitHub para fazer isso.'));
    if (papel && pedido.sessao.papel !== papel) {
      return seguir(new ErroDaApi('proibido', `Só quem tem o papel "${papel}" pode fazer isso.`));
    }
    seguir();
  };
}

/** Papel de um login: mantenedor se está na lista MANTENEDORES; senão, pessoa. */
export const papelDe = (usuario, mantenedores) => (mantenedores.includes(usuario.toLowerCase()) ? 'mantenedor' : 'pessoa');

/**
 * Rotas de /v1/auth. O fetch é injetado: os testes usam um GitHub simulado.
 * @param {{ rota: Function, sessoes: ReturnType<typeof criarSessoes>, config: ReturnType<typeof configDoAmbiente>, buscar?: typeof fetch }} opcoes
 */
export function rotasDeAutenticacao({ rota, sessoes, config, buscar = fetch }) {
  const configurado = () => {
    if (!config.clienteId || !config.segredo) {
      throw new ErroDaApi('indisponivel', 'O login com o GitHub não está configurado nesta API (faltam GITHUB_CLIENT_ID e GITHUB_CLIENT_SECRET).');
    }
  };

  rota('get', '/auth/entrar', (_pedido, resposta) => {
    configurado();
    const state = randomBytes(24).toString('base64url');
    resposta.cookie(COOKIE_DO_STATE, state, { ...OPCOES_DO_COOKIE, path: '/v1/auth', maxAge: MINUTOS_DO_STATE * 60_000 });
    const url = new URL('https://github.com/login/oauth/authorize');
    url.search = new URLSearchParams({ client_id: config.clienteId, redirect_uri: config.urlDeRetorno, state, allow_signup: 'false' }).toString();
    resposta.redirect(302, url.href);
  });

  rota('get', '/auth/retorno', async (pedido, resposta) => {
    configurado();
    const { code, state } = pedido.query;
    const esperado = lerCookies(pedido.get('cookie'))[COOKIE_DO_STATE];
    resposta.clearCookie(COOKIE_DO_STATE, { ...OPCOES_DO_COOKIE, path: '/v1/auth' });
    if (!esperado || !iguais(state, esperado)) {
      throw new ErroDaApi('proibido', 'O "state" do login não confere. Comece de novo em /v1/auth/entrar.');
    }
    if (typeof code !== 'string' || !code) throw new ErroDaApi('validacao', 'O GitHub não mandou o "code".', { erros: [{ campo: 'code', mensagem: 'code é obrigatório.' }] });

    let token;
    try {
      const troca = await buscar('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: config.clienteId, client_secret: config.segredo, code, redirect_uri: config.urlDeRetorno }),
        signal: AbortSignal.timeout(5000),
      });
      token = (await troca.json()).access_token;
    } catch {
      throw new ErroDaApi('falha-do-github', 'Não conseguimos trocar o código do login com o GitHub.');
    }
    if (!token) throw new ErroDaApi('proibido', 'O GitHub não aceitou o código do login. Comece de novo.');

    let usuario;
    try {
      const eu = await buscar('https://api.github.com/user', {
        headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'User-Agent': 'formacao-dev-api' },
        signal: AbortSignal.timeout(5000),
      });
      if (!eu.ok) throw new Error(`HTTP ${eu.status}`);
      usuario = (await eu.json()).login;
    } catch {
      throw new ErroDaApi('falha-do-github', 'Não conseguimos ler o usuário no GitHub.');
    }

    const id = sessoes.criar(usuario, papelDe(usuario, config.mantenedores));
    resposta.cookie(COOKIE_DA_SESSAO, id, { ...OPCOES_DO_COOKIE, maxAge: HORAS_DA_SESSAO * 3_600_000 });
    resposta.redirect(302, config.urlDoPainel);
  });

  rota('post', '/auth/sair', (pedido, resposta) => {
    const id = lerCookies(pedido.get('cookie'))[COOKIE_DA_SESSAO];
    if (id) sessoes.apagar(id);
    resposta.clearCookie(COOKIE_DA_SESSAO, OPCOES_DO_COOKIE);
    resposta.status(204).end();
  });

  rota('get', '/auth/eu', exigirPapel(), (pedido, resposta) => {
    resposta.set('Cache-Control', 'no-store');
    resposta.json(pedido.sessao);
  });
}
