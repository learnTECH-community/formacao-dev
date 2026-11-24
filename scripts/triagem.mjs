// T11.6 e #324: triagem diária do repositório. Só lê o GitHub (usa o `gh`) e grava um relatório local.
// Uso: node scripts/triagem.mjs [AAAA-MM-DD]   -> grava triagem/AAAA-MM-DD.md (pasta fora do Git)
// Regra: a primeira resposta a quem é de fora chega em até 48 h. Alerta em 36 h, prazo em 48 h.
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ALERTA_H = 36;
export const PRAZO_H = 48;
export const DEPENDABOT_DIAS = 2;
export const EXCECAO_DIAS = 7;
export const ESTOQUE_MIN = 10;

const horasEntre = (desde, agora) => Math.floor((agora - new Date(desde)) / 36e5);
const diasEntre = (desde, agora) => Math.floor((agora - new Date(desde)) / 864e5);

export const ehBot = (login = '') => login.endsWith('[bot]') || login.startsWith('app/');

/** De fora: não é bot nem membro ou colaborador (`dentro` em minúsculas). */
export const deFora = (login, dentro) => Boolean(login) && !ehBot(login) && !dentro.has(login.toLowerCase());

/** Situação de um item de fora: respondido por alguém de dentro, ou há quantas horas espera. */
export function situacao(criadoEm, comentarios, dentro, agora = new Date()) {
  if (comentarios.some((c) => dentro.has((c.author?.login ?? '').toLowerCase()))) return 'respondido';
  const h = horasEntre(criadoEm, agora);
  if (h >= PRAZO_H) return `🔴 sem resposta há ${h} h (passou das ${PRAZO_H} h)`;
  if (h >= ALERTA_H) return `🟠 sem resposta há ${h} h`;
  return `sem resposta há ${h} h`;
}

/** Estado do CI a partir do `statusCheckRollup` do `gh pr list`. */
export function estadoDoCi(rollup = []) {
  if (!rollup.length) return 'sem checks';
  const ruins = rollup.filter((c) => ['FAILURE', 'ERROR', 'TIMED_OUT', 'CANCELLED'].includes(c.conclusion ?? c.state));
  if (ruins.length) return `vermelho (${ruins.map((c) => c.name).join(', ')})`;
  if (rollup.some((c) => c.status && c.status !== 'COMPLETED')) return 'rodando';
  return 'verde';
}

/** O título do Dependabot indica versão maior? ("Bump x from 4 to 7" -> sim; "from 1.30-alpine to 1.31-alpine" -> não) */
export function ehVersaoMaior(titulo) {
  const m = titulo.match(/from v?(\d+)\S* to v?(\d+)/);
  return m ? m[1] !== m[2] : false;
}

export function recomendacao(ci, maior) {
  if (ci.startsWith('vermelho')) return 'investigar o CI antes';
  if (maior) return 'ler as notas de migração e mesclar';
  return ci === 'verde' ? 'mesclar' : 'esperar o CI';
}

/** Lê as exceções do `.trivyignore` (`ID exp:AAAA-MM-DD`) e quantos dias faltam. */
export function excecoesDoTrivy(texto, agora = new Date()) {
  return [...texto.matchAll(/^(\S+)\s+exp:(\d{4}-\d{2}-\d{2})/gm)].map(([, id, exp]) => ({
    id,
    exp,
    faltam: Math.ceil((new Date(`${exp}T23:59:59-03:00`) - agora) / 864e5),
  }));
}

export const ESTOQUE_LIMITE = 200;

// "vou fazer", "vou pegar", "quero fazer", "posso fazer?", "irei fazer", "vou fazê-la", "vou pegá-la",
// "eu faço", "deixa comigo" e "deixar comigo", com qualquer espaço ou quebra de linha entre as
// palavras (R19 do #338, achado 1; R19 do #340, item 4).
const PEDIDO = /(^|[^\p{L}])((?:vou|quero|posso|irei)\s+(?:fazer|pegar|faz[eê]-la|peg[aá]-la)|eu\s+fa[cç]o|deixar?\s+comigo)(?![\p{L}])/giu;
// Logo antes do pedido: "não", "nao," (R19 do #340, item 1: o veto vale para aquela ocorrência).
const NEGADO_ANTES = /n[aã]o[\s,]*$/iu;
// Logo depois do pedido: "uma pergunta", "uma dúvida", "uma sugestão", "um comentário", "o curso",
// "outra coisa" e "parte" (como em "eu faço parte").
const VETO_DEPOIS = /^\s+(?:(?:uma?|o|a)\s+)?(?:pergunta|d[uú]vida|sugest[aã]o|coment[aá]rio|curso|outra\s+coisa|parte)(?![\p{L}])/iu;
// "eu faço" só pede a issue no fim da frase, sozinho ou com "essa", "esta", "isso" ou "ela"
// (e "essa issue", "esta tarefa"). "Eu faço isso no trabalho" não pede (item 3).
const EU_FACO_OK = /^\s*(?:(?:essa|esta|isso|ela)(?:\s+(?:issue|tarefa))?\s*)?(?:$|[.!?,;)])/iu;

/**
 * O comentário pede a issue? Procura cada pedido e descarta só aquele que tem "não" logo antes ou
 * um veto logo depois, para que um "não vou fazer a #12, mas vou fazer esta" continue pedindo.
 * As linhas citadas ("> vou fazer", de outra pessoa) não contam.
 */
export function pedeAIssue(texto = '') {
  const proprio = String(texto ?? '')
    .split('\n')
    .filter((linha) => !/^\s*>/.test(linha))
    .join('\n');
  for (const m of proprio.matchAll(PEDIDO)) {
    const inicio = m.index + m[1].length;
    const fim = m.index + m[0].length;
    const antes = proprio.slice(Math.max(0, inicio - 6), inicio);
    const depois = proprio.slice(fim, fim + 25);
    if (NEGADO_ANTES.test(antes)) continue;
    if (VETO_DEPOIS.test(depois)) continue;
    if (/^eu/iu.test(m[2]) && !EU_FACO_OK.test(depois)) continue;
    return true;
  }
  return false;
}

/**
 * Estoque de issues de entrada (`good first issue`). Ocupada é a que tem alguém atribuído, um PR
 * ligado (achado 3) ou um comentário de quem é de fora pedindo a issue (achados 1 e 2; o "vou fazer
 * o merge" de quem mantém não conta). A meta é ter ESTOQUE_MIN ou mais livres.
 */
export function estoque(issues = [], dentro = new Set()) {
  const motivo = (i) => {
    if ((i.assignees ?? []).length > 0) return 'atribuída';
    if ((i.closedByPullRequestsReferences ?? []).length > 0) return 'PR ligado';
    const pedido = (i.comments ?? []).some((c) => !dentro.has((c.author?.login ?? '').toLowerCase()) && pedeAIssue(c.body ?? ''));
    return pedido ? 'pediu para fazer' : null;
  };
  const ocupadas = issues.map((i) => ({ ...i, motivo: motivo(i) })).filter((i) => i.motivo);
  return { total: issues.length, livres: issues.length - ocupadas.length, ocupadas, noLimite: issues.length >= ESTOQUE_LIMITE };
}

/** Monta o relatório em Markdown. Função pura: recebe os dados já lidos. */
export function relatorio({ hoje, hora, fora, dependabot, excecoes, dependeDoResponsavel, entrada = null, agora = new Date() }) {
  const L = [`# Triagem do formacao-dev · ${hoje}`, '', `Gerado às ${hora}, só leitura.`, ''];
  const vermelhos = fora.filter((x) => x.sit.startsWith('🔴')).length;
  const laranjas = fora.filter((x) => x.sit.startsWith('🟠')).length;
  L.push('## Resumo', '', '| Indicador | Hoje |', '|---|---|');
  L.push(`| Contribuições de fora abertas | ${fora.length} |`);
  L.push(`| Sem resposta há ${ALERTA_H} h ou mais | ${vermelhos + laranjas} (${vermelhos} passaram das ${PRAZO_H} h) |`);
  L.push(`| PRs do Dependabot abertos | ${dependabot.length} |`);
  L.push(`| Dependabot com mais de ${DEPENDABOT_DIAS} dias | ${dependabot.filter((d) => diasEntre(d.createdAt, agora) > DEPENDABOT_DIAS).length} |`);
  L.push(`| Exceções do Trivy vencendo em até ${EXCECAO_DIAS} dias | ${excecoes.filter((e) => e.faltam <= EXCECAO_DIAS).length} |`);
  if (entrada) {
    const repor = entrada.livres < ESTOQUE_MIN ? ' 🟠 repor' : '';
    L.push(`| Issues de entrada livres (meta: ${ESTOQUE_MIN} ou mais) | ${entrada.livres} de ${entrada.total}${repor} |`);
  }
  L.push('');
  if (entrada?.noLimite) L.push(`Atenção: foram lidas só ${ESTOQUE_LIMITE} issues de entrada. A contagem pode estar incompleta.`, '');

  L.push('## a) Contribuições de fora', '');
  if (!fora.length) L.push('Nenhuma aberta.', '');
  else {
    L.push('| Tipo | # | Título | Autor | Situação |', '|---|---|---|---|---|');
    for (const x of [...fora].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))) {
      L.push(`| ${x.tipo} | [#${x.number}](${x.url}) | ${x.title} | ${x.author.login} | ${x.sit} |`);
    }
    L.push('');
  }

  L.push('## b) Dependabot', '');
  if (!dependabot.length) L.push('Nenhum PR aberto.', '');
  else {
    L.push('| # | Título | Idade | CI | Maior? | Recomendação |', '|---|---|---|---|---|---|');
    for (const d of [...dependabot].sort((a, b) => a.number - b.number)) {
      const ci = estadoDoCi(d.statusCheckRollup);
      const maior = ehVersaoMaior(d.title);
      L.push(`| [#${d.number}](${d.url}) | ${d.title} | ${diasEntre(d.createdAt, agora)} d | ${ci} | ${maior ? 'sim' : 'não'} | ${recomendacao(ci, maior)} |`);
    }
    L.push('', 'Mesclar é do responsável. A recomendação não é aplicada sozinha.', '');
  }

  L.push('## c) Prazos', '');
  if (excecoes.length) {
    L.push('| Exceção do Trivy | Vence em | Faltam |', '|---|---|---|');
    for (const e of excecoes) L.push(`| ${e.id} | ${e.exp} | ${e.faltam} dia(s)${e.faltam <= EXCECAO_DIAS ? ' 🟠' : ''} |`);
    L.push('');
  } else L.push('Nenhuma exceção no `.trivyignore`.', '');
  if (entrada?.ocupadas.length) {
    L.push('Issues de entrada com alguém trabalhando:', '');
    for (const i of entrada.ocupadas) L.push(`- [#${i.number}](${i.url}) ${i.title}${i.motivo ? ` (${i.motivo})` : ''}`);
    L.push('');
  }
  L.push(`Issues \`depende-do-responsavel\` abertas: ${dependeDoResponsavel.length}`, '');
  for (const i of dependeDoResponsavel) L.push(`- [#${i.number}](${i.url}) ${i.title} (aberta há ${diasEntre(i.createdAt, agora)} d)`);
  return `${L.join('\n')}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ORG = 'learnTECH-community';
  const REPO = `${ORG}/formacao-dev`;
  const agora = new Date();
  const hoje = process.argv[2] ?? agora.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const gh = (args) => execFileSync('gh', args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const json = (args) => JSON.parse(gh(args));

  const dentro = new Set();
  for (const rota of [`orgs/${ORG}/members`, `repos/${REPO}/collaborators`]) {
    try {
      for (const login of gh(['api', '--paginate', rota, '--jq', '.[].login']).split('\n')) if (login) dentro.add(login.toLowerCase());
    } catch {
      // Sem permissão para listar: segue com o que tiver.
    }
  }

  const issues = json(['issue', 'list', '-R', REPO, '--state', 'open', '--limit', '500', '--json', 'number,title,author,createdAt,comments,url']);
  const prs = json(['pr', 'list', '-R', REPO, '--state', 'open', '--limit', '200', '--json', 'number,title,author,createdAt,comments,url,statusCheckRollup']);
  const [dono, nome] = REPO.split('/');
  const consulta = 'query($dono:String!,$nome:String!){repository(owner:$dono,name:$nome){discussions(first:50,orderBy:{field:CREATED_AT,direction:DESC},states:OPEN){nodes{number title url createdAt author{login} comments(first:20){nodes{author{login}}}}}}}';
  let discussoes = [];
  try {
    discussoes = json(['api', 'graphql', '-f', `query=${consulta}`, '-F', `dono=${dono}`, '-F', `nome=${nome}`]).data.repository.discussions.nodes;
  } catch {
    discussoes = [];
  }

  const fora = [
    ...issues.filter((i) => deFora(i.author?.login, dentro)).map((i) => ({ tipo: 'issue', ...i, comentarios: i.comments })),
    ...prs.filter((p) => deFora(p.author?.login, dentro)).map((p) => ({ tipo: 'PR', ...p, comentarios: p.comments })),
    ...discussoes.filter((d) => deFora(d.author?.login, dentro)).map((d) => ({ tipo: 'discussion', ...d, comentarios: d.comments.nodes })),
  ].map((x) => ({ ...x, sit: situacao(x.createdAt, x.comentarios, dentro, agora) }));

  let excecoes = [];
  try {
    excecoes = excecoesDoTrivy(Buffer.from(gh(['api', `repos/${REPO}/contents/.trivyignore`, '--jq', '.content']), 'base64').toString('utf8'), agora);
  } catch {
    excecoes = [];
  }

  const texto = relatorio({
    hoje,
    hora: agora.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
    fora,
    dependabot: prs.filter((p) => ehBot(p.author?.login)),
    excecoes,
    entrada: estoque(
      json(['issue', 'list', '-R', REPO, '--state', 'open', '--label', 'good first issue', '--limit', String(ESTOQUE_LIMITE), '--json', 'number,title,url,assignees,comments,closedByPullRequestsReferences']),
      dentro,
    ),
    dependeDoResponsavel: json(['issue', 'list', '-R', REPO, '--state', 'open', '--label', 'depende-do-responsavel', '--limit', '100', '--json', 'number,title,createdAt,url']),
    agora,
  });
  const pasta = new URL('../triagem/', import.meta.url);
  mkdirSync(pasta, { recursive: true });
  const destino = fileURLToPath(new URL(`${hoje}.md`, pasta));
  writeFileSync(destino, texto);
  console.log(destino);
}
