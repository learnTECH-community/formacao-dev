// T10.12: lê os relatórios JSON do OWASP ZAP e falha se houver alerta alto que não
// esteja nas regras (zap/regras.tsv). Os alertas médios e baixos aparecem na lista,
// para tratar em issue, mas não barram o CI.
// Uso: node scripts/zap.mjs zap/regras.tsv relatorio1.json [relatorio2.json ...]
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const RISCOS = { 0: 'informativo', 1: 'baixo', 2: 'médio', 3: 'alto' };

/**
 * Regras no formato do ZAP: "id<TAB>IGNORE|WARN|FAIL<TAB>(motivo)". Linhas com # são
 * comentário. Toda regra IGNORE precisa de motivo.
 */
export function lerRegras(texto) {
  const regras = new Map();
  const erros = [];
  for (const [i, linha] of texto.split(/\r?\n/).entries()) {
    if (!linha.trim() || linha.startsWith('#')) continue;
    const [id, acao, motivo = ''] = linha.split('\t');
    if (!/^\d+$/.test(id) || !['IGNORE', 'WARN', 'FAIL'].includes(acao)) {
      erros.push(`linha ${i + 1}: use "id<TAB>IGNORE|WARN|FAIL<TAB>(motivo)"`);
      continue;
    }
    if (acao === 'IGNORE' && !motivo.replace(/[()]/g, '').trim()) erros.push(`linha ${i + 1}: a regra ${id} é ignorada sem motivo`);
    regras.set(id, { acao, motivo: motivo.replace(/^\(|\)$/g, '') });
  }
  return { regras, erros };
}

/** Alertas de um relatório JSON do ZAP (formato "traditional-json"). */
export function alertasDoRelatorio(relatorio) {
  return (relatorio.site ?? []).flatMap((site) =>
    (site.alerts ?? []).map((a) => ({ id: String(a.pluginid), nome: a.name ?? a.alert, risco: Number(a.riskcode), instancias: Number(a.count ?? a.instances?.length ?? 0), site: site['@name'] })),
  );
}

/** Alertas altos que não estão marcados como IGNORE nas regras. */
export function altosSemExcecao(alertas, regras) {
  return alertas.filter((a) => a.risco >= 3 && regras.get(a.id)?.acao !== 'IGNORE');
}

export function resumo(alertas, regras) {
  return alertas
    .toSorted((a, b) => b.risco - a.risco || a.id.localeCompare(b.id))
    .map((a) => {
      const regra = regras.get(a.id);
      const marca = regra?.acao === 'IGNORE' ? ` [ignorado: ${regra.motivo}]` : '';
      return `- ${RISCOS[a.risco] ?? a.risco}: ${a.nome} (regra ${a.id}, ${a.instancias} ocorrência(s), ${a.site})${marca}`;
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [arquivoDeRegras, ...relatorios] = process.argv.slice(2);
  if (!arquivoDeRegras || !relatorios.length) {
    console.error('Uso: node scripts/zap.mjs zap/regras.tsv relatorio.json [...]');
    process.exit(2);
  }
  const { regras, erros } = lerRegras(readFileSync(arquivoDeRegras, 'utf8'));
  if (erros.length) {
    console.error(`Regras inválidas em ${arquivoDeRegras}:\n${erros.join('\n')}`);
    process.exit(1);
  }
  const alertas = relatorios.flatMap((r) => alertasDoRelatorio(JSON.parse(readFileSync(r, 'utf8'))));
  console.log(`Alertas do ZAP (${alertas.length}):\n${resumo(alertas, regras).join('\n') || '- nenhum'}`);
  const altos = altosSemExcecao(alertas, regras);
  if (altos.length) {
    console.error(`\n${altos.length} alerta(s) alto(s) sem exceção registrada. Corrija ou registre em ${arquivoDeRegras}, com o motivo.`);
    process.exit(1);
  }
  console.log('\nNenhum alerta alto.');
}
