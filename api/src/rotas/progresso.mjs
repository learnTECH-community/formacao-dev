// T6.2: rotas do progresso por trilha e por pessoa. O cálculo fica no banco
// (view v_progresso_trilha e consultas .sql); a rota só repassa (T6.10).
import { jsonComEtag } from '../cache.mjs';

export function rotasDeProgresso({ rota, trilhas, repositorio }) {
  rota('get', '/progresso/trilhas', async (pedido, resposta) => {
    await trilhas(); // garante o catálogo no repositório antes de consultar
    jsonComEtag(pedido, resposta, { trilhas: await repositorio.progressoPorTrilha() });
  });

  rota('get', '/progresso/pessoas', async (pedido, resposta) => {
    await trilhas();
    jsonComEtag(pedido, resposta, { pessoas: await repositorio.progressoPorPessoa() });
  });
}
