// T9.8: confere se o painel publicado e a API respondem. Usado pelo workflow agendado
// .github/workflows/disponibilidade.yml. Mostra só o endereço, o status e o tempo:
// nenhum cabeçalho, corpo ou segredo vai para o log.
// Uso: node scripts/disponibilidade.mjs <endereço> [<endereço> ...]
//   sai com 1 se algum endereço não responder 2xx dentro do tempo limite.
import { appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Confere um endereço: status, tempo em ms e se passou. */
export async function conferir(url, { buscar = fetch, tempoLimite = 10_000, agora = () => performance.now() } = {}) {
  const inicio = agora();
  try {
    const resposta = await buscar(url, { redirect: 'follow', signal: AbortSignal.timeout(tempoLimite), headers: { 'User-Agent': 'formacao-dev-disponibilidade' } });
    await resposta.arrayBuffer().catch(() => {});
    return { url, status: resposta.status, ms: Math.round(agora() - inicio), ok: resposta.ok };
  } catch (erro) {
    const motivo = erro?.name === 'TimeoutError' ? `sem resposta em ${tempoLimite / 1000} s` : 'falha de rede';
    return { url, status: motivo, ms: Math.round(agora() - inicio), ok: false };
  }
}

/** Tabela em Markdown, para o resumo do run (o histórico fica nas execuções). */
export function tabela(resultados, hora = new Date()) {
  const linhas = resultados.map((r) => `| ${r.ok ? 'ok' : 'FALHA'} | ${r.url} | ${r.status} | ${r.ms} ms |`);
  return [`### Disponibilidade em ${hora.toISOString()}`, '', '| Situação | Endereço | Status | Tempo |', '|---|---|---|---|', ...linhas, ''].join('\n');
}

/** Só endereços http(s) de verdade; nada de texto solto no log. */
export function enderecosValidos(lista) {
  return lista.filter((u) => {
    try {
      return ['http:', 'https:'].includes(new URL(u).protocol);
    } catch {
      return false;
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const urls = enderecosValidos(process.argv.slice(2));
  if (!urls.length) {
    console.log('Nenhum endereço publicado para conferir.');
    process.exit(0);
  }
  const resultados = await Promise.all(urls.map((u) => conferir(u)));
  const texto = tabela(resultados);
  console.log(texto);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${texto}\n`);
  process.exit(resultados.every((r) => r.ok) ? 0 : 1);
}
