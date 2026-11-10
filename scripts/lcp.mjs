// T7.3: mede o LCP no celular com o Lighthouse, 3 execuções, e mostra a mediana.
// Uso (local): npm run build && npm run lcp
//      (no ar):  node scripts/lcp.mjs https://endereco-publicado/
// Sem endereço, sobe o servidor com compressão (scripts/servidor.mjs) numa porta livre.
// Execução com erro do Lighthouse ou com a máquina sobrecarregada (FCP observado acima de 2 s
// ou TBT acima de 5 s) é descartada e repetida, até 3 válidas ou 6 tentativas.
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { criarServidor } from './servidor.mjs';

export const META_MS = 2500;
const LIGHTHOUSE = 'lighthouse@12.8.2';

/** Lê o que importa de um relatório JSON do Lighthouse. */
export function lerRelatorio(json) {
  const a = json.audits;
  const elemento = a['largest-contentful-paint-element']?.details?.items?.[0];
  const no = elemento?.items?.[0]?.node ?? elemento?.node;
  return {
    erro: json.runtimeError?.code ?? null,
    lcp: Math.round(a['largest-contentful-paint'].numericValue),
    tbt: Math.round(a['total-blocking-time'].numericValue),
    cls: Number(a['cumulative-layout-shift'].numericValue.toFixed(3)),
    fcpObservado: a.metrics?.details?.items?.[0]?.observedFirstContentfulPaint ?? null,
    elemento: no?.snippet ?? '(sem elemento)',
  };
}

/** Execução válida: sem erro e sem sinal de máquina sobrecarregada. */
export function valida(r) {
  return !r.erro && (r.fcpObservado === null || r.fcpObservado < 2000) && r.tbt < 5000;
}

export function mediana(valores) {
  const v = [...valores].sort((a, b) => a - b);
  return v.length % 2 ? v[(v.length - 1) / 2] : Math.round((v[v.length / 2 - 1] + v[v.length / 2]) / 2);
}

const executar = promisify(exec);

// Assíncrono de propósito: o servidor local roda neste mesmo processo e precisa responder.
async function medir(endereco, pasta, n) {
  const saida = join(pasta, `lh-${n}.json`);
  try {
    // As aspas em --chrome-flags valem no sh e no cmd do Windows.
    await executar(
      `npx -y ${LIGHTHOUSE} ${endereco} --only-categories=performance --output=json --output-path="${saida}" --chrome-flags="--headless --no-sandbox" --quiet`,
      { timeout: 150_000 },
    );
  } catch {
    // O Lighthouse às vezes sai com erro e ainda grava o relatório; se não gravou, a execução é descartada.
  }
  try {
    return lerRelatorio(JSON.parse(readFileSync(saida, 'utf8')));
  } catch {
    return { erro: 'SEM_RELATORIO', lcp: 0, tbt: 0, cls: 0, fcpObservado: null, elemento: '' };
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  let endereco = process.argv[2];
  let servidor;
  if (!endereco) {
    servidor = criarServidor(fileURLToPath(new URL('../dist', import.meta.url)));
    await new Promise((r) => servidor.listen(0, '127.0.0.1', r));
    endereco = `http://127.0.0.1:${servidor.address().port}/`;
  }
  const pasta = mkdtempSync(join(tmpdir(), 'lcp-'));
  const validas = [];
  try {
    for (let tentativa = 1; validas.length < 3 && tentativa <= 6; tentativa++) {
      const r = await medir(endereco, pasta, tentativa);
      const ok = valida(r);
      console.log(
        `${ok ? 'válida   ' : 'descartada'} #${tentativa}: LCP ${r.lcp} ms · TBT ${r.tbt} ms · CLS ${r.cls} · FCP observado ${r.fcpObservado ?? '?'} ms${r.erro ? ` · erro ${r.erro}` : ''} · elemento ${r.elemento}`,
      );
      if (ok) validas.push(r);
    }
  } finally {
    servidor?.close();
    rmSync(pasta, { recursive: true, force: true });
  }
  if (validas.length < 3) {
    console.error(`Só ${validas.length} execuções válidas; rode de novo com a máquina mais livre.`);
    process.exit(2);
  }
  const m = mediana(validas.map((r) => r.lcp));
  console.log(`Mediana do LCP (${endereco}): ${m} ms · meta: até ${META_MS} ms · ${m <= META_MS ? 'dentro da meta' : 'ACIMA DA META'}`);
  process.exit(m <= META_MS ? 0 : 1);
}
