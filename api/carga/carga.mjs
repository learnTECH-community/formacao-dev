// T7.10: teste de carga da API com o autocannon.
// Sobe a API neste processo, com o SQLite em memória e os dados fictícios
// (npm run semear), e faz 50 pedidos simultâneos por rota durante DURACAO segundos.
// A latência de cada resposta é guardada para calcular o p95 (o autocannon só
// entrega p90 e p97,5). Meta: p95 abaixo de 300 ms em toda rota.
// Uso: npm run carga            (3 execuções de 10 s por rota)
//      npm run carga -- 1 5     (1 execução de 5 s)
import { fileURLToPath } from 'node:url';
import autocannon from 'autocannon';
import { criarApp } from '../src/app.mjs';
import { abrirBanco } from '../src/banco/conexao.mjs';
import { semear } from '../src/banco/semear.mjs';
import { criarRepositorioSqlite } from '../src/repositorios/sqlite.mjs';

export const META_P95_MS = 300;
export const CONEXOES = 50;
export const ROTAS = ['/v1/health', '/v1/catalogo', '/v1/itens?trilha=T5&limite=20', '/v1/progresso/trilhas', '/v1/ranking'];
const MUDO = { debug() {}, info() {}, warn() {}, error() {} };

/** Percentil pelo método do posto mais próximo, numa lista já ordenada. */
export function percentil(ordenada, p) {
  if (ordenada.length === 0) return NaN;
  return ordenada[Math.min(ordenada.length - 1, Math.ceil((p / 100) * ordenada.length) - 1)];
}

export async function subirParaCarga() {
  const banco = abrirBanco(':memory:');
  semear(banco);
  // O limite por minuto fica alto: aqui medimos a API, não o limitador (T5.5).
  const app = criarApp({ repositorio: criarRepositorioSqlite(banco), log: MUDO, limitePorMinuto: 10_000_000 });
  const servidor = await new Promise((pronto) => {
    const s = app.listen(0, '127.0.0.1', () => pronto(s));
  });
  return { base: `http://127.0.0.1:${servidor.address().port}`, fechar: () => servidor.close() };
}

/** Uma rodada numa rota. Devolve pedidos, erros e latências (ms). */
export function medir(url, { conexoes = CONEXOES, segundos = 10 } = {}) {
  const latencias = [];
  return new Promise((pronto, falhar) => {
    autocannon(
      {
        url,
        connections: conexoes,
        duration: segundos,
        setupClient(cliente) {
          cliente.on('response', (_status, _bytes, tempo) => latencias.push(tempo));
        },
      },
      (erro, r) => {
        if (erro) return falhar(erro);
        latencias.sort((a, b) => a - b);
        pronto({
          pedidos: r.requests.total,
          porSegundo: Math.round(r.requests.average),
          erros: r.errors + r.timeouts + r.non2xx,
          p50: percentil(latencias, 50),
          p95: percentil(latencias, 95),
          p99: percentil(latencias, 99),
          maximo: latencias.at(-1),
        });
      },
    );
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const execucoes = Number(process.argv[2]) || 3;
  const segundos = Number(process.argv[3]) || 10;
  const api = await subirParaCarga();
  console.log(`Carga: ${CONEXOES} conexões simultâneas, ${segundos} s por rota, ${execucoes} execução(ões). Meta: p95 < ${META_P95_MS} ms.`);
  console.log('| Execução | Rota | Pedidos | Pedidos/s | Erros | p50 (ms) | p95 (ms) | p99 (ms) | Máx. (ms) |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  let passou = true;
  for (let e = 1; e <= execucoes; e++) {
    for (const rota of ROTAS) {
      const r = await medir(`${api.base}${rota}`, { segundos });
      const ok = r.p95 < META_P95_MS && r.erros === 0;
      passou &&= ok;
      const f = (n) => n.toFixed(1);
      console.log(`| ${e} | \`${rota}\` | ${r.pedidos} | ${r.porSegundo} | ${r.erros} | ${f(r.p50)} | ${f(r.p95)}${ok ? '' : ' ✗'} | ${f(r.p99)} | ${f(r.maximo)} |`);
    }
  }
  api.fechar();
  console.log(passou ? `\nMeta cumprida: p95 < ${META_P95_MS} ms e nenhum erro.` : `\nMeta NÃO cumprida em alguma rota (✗).`);
  process.exit(passou ? 0 : 1);
}
