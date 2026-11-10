// Leva as trilhas e os itens do CATALOGO.md para o banco, com SQL parametrizado.
// O catálogo é a fonte: a cada leitura, o banco é atualizado (insere ou troca o
// texto); item que saiu do catálogo e não tem conclusão é apagado.

/**
 * @param {import('node:sqlite').DatabaseSync} banco
 * @param {{ codigo: string, nome: string, itens: { codigo: string, texto: string, feito: boolean }[] }[]} trilhas
 */
export function gravarCatalogo(banco, trilhas) {
  const trilha = banco.prepare(`INSERT INTO trilhas (codigo, nome, posicao) VALUES (?, ?, ?)
    ON CONFLICT (codigo) DO UPDATE SET nome = excluded.nome, posicao = excluded.posicao`);
  const item = banco.prepare(`INSERT INTO itens (codigo, trilha, texto, marcado, posicao) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT (codigo) DO UPDATE SET trilha = excluded.trilha, texto = excluded.texto,
      marcado = excluded.marcado, posicao = excluded.posicao`);
  banco.exec('BEGIN');
  try {
    trilhas.forEach((t, i) => {
      trilha.run(t.codigo, t.nome, i + 1);
      t.itens.forEach((it, j) => item.run(it.codigo, t.codigo, it.texto, it.feito ? 1 : 0, j + 1));
    });
    const codigos = JSON.stringify(trilhas.flatMap((t) => t.itens.map((i) => i.codigo)));
    // json_each recebe a lista como um parâmetro só: nada de montar "IN (...)" com texto.
    banco
      .prepare(`DELETE FROM itens WHERE codigo NOT IN (SELECT value FROM json_each(?))
        AND NOT EXISTS (SELECT 1 FROM conclusoes c WHERE c.item = itens.codigo)`)
      .run(codigos);
    banco.exec('COMMIT');
  } catch (erro) {
    banco.exec('ROLLBACK');
    throw erro;
  }
}
