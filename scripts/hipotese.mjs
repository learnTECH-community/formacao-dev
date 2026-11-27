// #319: o funil da hipótese do MVP ("3 pessoas concluírem a T2 até 08/12/2026"). Só lê o GitHub.
// Uso: node scripts/hipotese.mjs [--leitura item|trilha]   -> grava triagem/hipotese-AAAA-MM-DD.md (fora do Git)
// Leituras de "concluir a T2" (a decisão é do responsável; o padrão segue o aceite da #319):
//   item   -> a pessoa teve pelo menos 1 PR de um item da T2 mesclado;
//   trilha -> a pessoa teve PRs mesclados de todos os itens da T2 do CATALOGO.md.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { deFora, pedeAIssue } from './triagem.mjs';

export const META = 3;
export const PRAZO = '2026-12-08';
export const INICIO = '2026-11-10';
export const LIMITE_ISSUES = 500;
export const LIMITE_PRS = 500;
export const LIMITE_T2 = 100;

/** Os códigos dos itens da T2 no CATALOGO.md ("**T2.1**"...). */
export function itensDaT2(catalogo) {
  return [...new Set([...catalogo.matchAll(/\*\*(T2\.\d+)\*\*/g)].map((m) => m[1]))];
}

/** O código T2.n citado num texto (título de issue ou de PR), ou `null`. */
export function codigoT2(texto = '') {
  const m = texto.match(/\bT2\.(\d+)\b/);
  return m ? `T2.${m[1]}` : null;
}

/**
 * O item da T2 de um PR: pelo título ("T2.9: ..."), pelo vínculo do GitHub (`closingIssuesReferences`,
 * que cobre "Closes: #n", a referência completa e a barra lateral) ou, de reserva, pelo corpo.
 * `codigoDaIssue` é um Map(número da issue → código T2.n).
 */
export function itemDoPr(pr, codigoDaIssue) {
  const peloTitulo = codigoT2(pr.title);
  if (peloTitulo) return peloTitulo;
  for (const ref of pr.closingIssuesReferences ?? []) {
    const c = codigoDaIssue.get(ref.number);
    if (c) return c;
  }
  for (const m of (pr.body ?? '').matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?):?\s+#(\d+)/gi)) {
    const c = codigoDaIssue.get(Number(m[1]));
    if (c) return c;
  }
  return null;
}

/**
 * O funil por pessoa de fora. Etapas: chegou (autora de issue ou de PR, ou comentou numa issue da T2), pediu ("vou fazer"
 * numa issue da T2), abriu PR de um item da T2, teve PR mesclado e concluiu (pela leitura escolhida).
 */
export function funil({ issues, issuesT2, prs, dentro, itens, leitura = 'item', ate = PRAZO }) {
  const codigoDaIssue = new Map(issuesT2.map((i) => [i.number, codigoT2(i.title)]).filter(([, c]) => c));
  // Vale o merge até o fim de 08/12 em Brasília: antes da 0h de 09/12 (R19 QA do #360).
  const limite = new Date(new Date(`${ate}T00:00:00-03:00`).getTime() + 864e5);
  const pessoas = new Map();
  const pessoa = (login) => {
    const chave = login.toLowerCase();
    if (!pessoas.has(chave)) pessoas.set(chave, { login, pediu: new Set(), abriu: new Set(), mesclou: new Set(), links: [] });
    return pessoas.get(chave);
  };
  const ehDeFora = (login) => deFora(login, dentro);

  for (const i of issues) if (ehDeFora(i.author?.login)) pessoa(i.author.login);
  for (const i of issuesT2) {
    for (const c of i.comments ?? []) {
      if (!ehDeFora(c.author?.login)) continue;
      const p = pessoa(c.author.login);
      if (pedeAIssue(c.body ?? '') && codigoDaIssue.has(i.number)) p.pediu.add(codigoDaIssue.get(i.number));
    }
  }
  for (const pr of prs) {
    if (!ehDeFora(pr.author?.login)) continue;
    const p = pessoa(pr.author.login);
    const item = itemDoPr(pr, codigoDaIssue);
    if (!item) continue;
    p.abriu.add(item);
    p.links.push(pr.url);
    if (pr.mergedAt && new Date(pr.mergedAt) < limite) p.mesclou.add(item);
  }

  const conclui = (p) => (leitura === 'trilha' ? itens.length > 0 && itens.every((c) => p.mesclou.has(c)) : p.mesclou.size > 0);
  const lista = [...pessoas.values()];
  // Sem a lista de dentro, o dono e a equipe contariam como de fora: "Concluiu" não é calculado (R19 QA do #360).
  const semDentro = dentro.size === 0;
  return {
    leitura,
    semDentro,
    chegou: lista.length,
    pediu: lista.filter((p) => p.pediu.size).length,
    abriu: lista.filter((p) => p.abriu.size).length,
    mesclou: lista.filter((p) => p.mesclou.size).length,
    concluiu: semDentro ? [] : lista.filter(conclui).map((p) => p.login),
    pessoas: lista,
  };
}

/** O motivo provável que a #319 pede em 08/12: a primeira etapa onde o funil para. */
export function motivoProvavel(f) {
  if (f.semDentro) return 'sem a lista de membros e colaboradores, o funil não é confiável: confira o login do gh e rode de novo';
  if (f.concluiu.length >= META) return 'hipótese confirmada';
  if (!f.chegou) return 'ninguém chegou: o problema é a divulgação';
  if (!f.pediu && !f.abriu) return 'chegou e não pediu issue: as issues de entrada não estão claras ou não foram achadas';
  if (!f.abriu) return 'pediu e não abriu PR: travou no começo (o prazo de 7 dias do #344 ajuda a ver onde)';
  if (!f.mesclou) return 'abriu PR e não mesclou: revisão lenta ou CI difícil';
  return 'mesclou, mas menos pessoas que a meta: falta gente, e não clareza';
}

/** O relatório em Markdown. Função pura. */
export function relatorio({ hoje, f, total, noLimite = false }) {
  const L = [`# Hipótese do MVP (#319) · ${hoje}`, '', `Meta: ${META} pessoas concluírem a T2 até ${PRAZO.split('-').reverse().join('/')}. Leitura de "concluir": **${f.leitura === 'trilha' ? `a trilha inteira (${total} itens)` : '1 item da T2 mesclado'}**. Só leitura.`, ''];
  if (f.semDentro) L.push('⚠️ **Atenção:** não deu para ler os membros nem os colaboradores. Todos aparecem como de fora, e a etapa "Concluiu" não foi calculada.', '');
  if (noLimite) L.push('⚠️ **Atenção:** a leitura bateu no limite de issues ou de PRs. A contagem pode estar incompleta.', '');
  L.push('| Etapa | Pessoas de fora |', '|---|---|');
  L.push(`| 1. Chegou | ${f.chegou} |`, `| 2. Pediu uma issue da T2 | ${f.pediu} |`, `| 3. Abriu PR de um item da T2 | ${f.abriu} |`, `| 4. Teve PR mesclado | ${f.mesclou} |`);
  L.push(`| 5. Concluiu | ${f.semDentro ? 'não calculado' : `${f.concluiu.length} de ${META}${f.concluiu.length >= META ? ' ✅' : ''}`} |`, '');
  L.push(`**Motivo provável:** ${motivoProvavel(f)}.`, '');
  const ativos = f.pessoas.filter((p) => p.pediu.size || p.abriu.size);
  if (ativos.length) {
    L.push('| Pessoa | Pediu | Abriu PR | Mesclado |', '|---|---|---|---|');
    for (const p of ativos) L.push(`| ${p.login} | ${[...p.pediu].join(', ') || '—'} | ${[...p.abriu].join(', ') || '—'} | ${[...p.mesclou].join(', ') || '—'} |`);
    L.push('');
  }
  return `${L.join('\n')}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const ORG = 'learnTECH-community';
  const REPO = `${ORG}/formacao-dev`;
  const i = process.argv.indexOf('--leitura');
  const leitura = i > 0 ? process.argv[i + 1] : 'item';
  if (!['item', 'trilha'].includes(leitura)) {
    console.error('Uso: node scripts/hipotese.mjs [--leitura item|trilha]');
    process.exit(1);
  }
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
  const desde = `created:>=${INICIO}`;
  const issues = json(['issue', 'list', '-R', REPO, '--state', 'all', '--search', desde, '--limit', String(LIMITE_ISSUES), '--json', 'number,author']);
  const issuesT2 = json(['issue', 'list', '-R', REPO, '--state', 'all', '--label', 'trilha:T2', '--limit', String(LIMITE_T2), '--json', 'number,title,comments']);
  const prs = json(['pr', 'list', '-R', REPO, '--state', 'all', '--search', desde, '--limit', String(LIMITE_PRS), '--json', 'number,title,body,author,mergedAt,url,closingIssuesReferences']);
  const itens = itensDaT2(readFileSync(new URL('../CATALOGO.md', import.meta.url), 'utf8'));
  const hoje = new Date().toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' });
  const f = funil({ issues, issuesT2, prs, dentro, itens, leitura });
  const noLimite = issues.length >= LIMITE_ISSUES || prs.length >= LIMITE_PRS || issuesT2.length >= LIMITE_T2;
  const texto = relatorio({ hoje, f, total: itens.length, noLimite });
  if (f.semDentro) process.exitCode = 2;
  const pasta = new URL('../triagem/', import.meta.url);
  mkdirSync(pasta, { recursive: true });
  const destino = fileURLToPath(new URL(`hipotese-${hoje}.md`, pasta));
  writeFileSync(destino, texto);
  console.log(destino);
}
