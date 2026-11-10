// T6.12: repositório MongoDB, com a mesma interface do SQLite (contrato.mjs).
// Coleções: trilhas { _id: "T2" }, itens { _id: "T2.3", trilha }, conclusoes
// { _id: <número>, item, usuario, pr, concluidaEm } e contadores (o id que cresce).
// O índice único { item, usuario } faz o papel da UNIQUE do SQLite (T6.5).
// Sem chave estrangeira no MongoDB: quem garante que o item existe é a API (T5.2).
// T6.13: o progresso por trilha sai de um pipeline de agregação ($match, $group, $project).

const DUPLICADO = 11000;

/** Pipeline do progresso por trilha (T6.13), sobre a coleção trilhas. Mesmo resultado da view SQL. */
export const PIPELINE_DO_PROGRESSO = [
  { $sort: { posicao: 1 } },
  // Itens da trilha, pelo índice { trilha, posicao }.
  { $lookup: { from: 'itens', localField: '_id', foreignField: 'trilha', as: 'item' } },
  { $unwind: { path: '$item', preserveNullAndEmptyArrays: true } },
  // Uma conclusão do item basta; o $match usa o índice { item, usuario }.
  {
    $lookup: {
      from: 'conclusoes',
      let: { codigo: '$item._id' },
      pipeline: [{ $match: { $expr: { $eq: ['$item', '$$codigo'] } } }, { $limit: 1 }, { $project: { _id: 1 } }],
      as: 'conclusao',
    },
  },
  {
    $group: {
      _id: '$_id',
      nome: { $first: '$nome' },
      posicao: { $first: '$posicao' },
      total: { $sum: { $cond: [{ $ifNull: ['$item', false] }, 1, 0] } },
      feitos: {
        $sum: { $cond: [{ $and: [{ $ifNull: ['$item', false] }, { $or: ['$item.marcado', { $gt: [{ $size: '$conclusao' }, 0] }] }] }, 1, 0] },
      },
    },
  },
  {
    $project: {
      _id: 0,
      trilha: '$_id',
      nome: 1,
      posicao: 1,
      feitos: 1,
      total: 1,
      // Arredonda para baixo, como a view e o painel.
      percentual: { $cond: [{ $eq: ['$total', 0] }, 0, { $floor: { $divide: [{ $multiply: ['$feitos', 100] }, '$total'] } }] },
    },
  },
  { $sort: { posicao: 1 } },
  { $project: { posicao: 0 } },
];

const daConclusao = (d) => (d ? { id: d._id, item: d.item, usuario: d.usuario, pr: d.pr, concluidaEm: d.concluidaEm } : null);

/**
 * @param {import('mongodb').Db} db
 * @returns {Promise<import('./contrato.mjs').Repositorio>}
 */
export async function criarRepositorioMongo(db) {
  const trilhas = db.collection('trilhas');
  const itens = db.collection('itens');
  const conclusoes = db.collection('conclusoes');
  const contadores = db.collection('contadores');
  await Promise.all([
    conclusoes.createIndex({ item: 1, usuario: 1 }, { unique: true, name: 'item_1_usuario_1' }),
    conclusoes.createIndex({ usuario: 1 }, { name: 'usuario_1' }),
    itens.createIndex({ trilha: 1, posicao: 1 }, { name: 'trilha_1_posicao_1' }),
  ]);

  const proximoId = async () => (await contadores.findOneAndUpdate({ _id: 'conclusoes' }, { $inc: { valor: 1 } }, { upsert: true, returnDocument: 'after' })).valor;

  return {
    async saude() {
      return { conclusoes: await conclusoes.countDocuments() };
    },

    async gravarCatalogo(lista) {
      const codigos = lista.flatMap((t) => t.itens.map((i) => i.codigo));
      if (lista.length) {
        await trilhas.bulkWrite(
          lista.map((t, i) => ({ updateOne: { filter: { _id: t.codigo }, update: { $set: { nome: t.nome, posicao: i + 1 } }, upsert: true } })),
        );
      }
      const operacoes = lista.flatMap((t) =>
        t.itens.map((it, j) => ({
          updateOne: { filter: { _id: it.codigo }, update: { $set: { trilha: t.codigo, texto: it.texto, marcado: it.feito, posicao: j + 1 } }, upsert: true },
        })),
      );
      if (operacoes.length) await itens.bulkWrite(operacoes);
      // Item que saiu do catálogo e não tem conclusão sai também (como no SQLite).
      const comConclusao = await conclusoes.distinct('item');
      await itens.deleteMany({ _id: { $nin: [...codigos, ...comConclusao] } });
    },

    async registrarConclusao({ item, usuario, pr, concluidaEm }) {
      const documento = { _id: await proximoId(), item, usuario, pr, concluidaEm };
      try {
        await conclusoes.insertOne(documento);
        return { conclusao: daConclusao(documento), criada: true };
      } catch (erro) {
        if (erro?.code !== DUPLICADO) throw erro;
        return { conclusao: daConclusao(await conclusoes.findOne({ item, usuario })), criada: false };
      }
    },

    async listarConclusoes({ item, usuario } = {}) {
      const filtro = { ...(item !== undefined && { item }), ...(usuario !== undefined && { usuario }) };
      return (await conclusoes.find(filtro).sort({ _id: 1 }).toArray()).map(daConclusao);
    },

    async obterConclusao(id) {
      return daConclusao(await conclusoes.findOne({ _id: id }));
    },

    async atualizarConclusao(id, { pr }) {
      return daConclusao(await conclusoes.findOneAndUpdate({ _id: id }, { $set: { pr } }, { returnDocument: 'after' }));
    },

    async apagarConclusao(id) {
      return (await conclusoes.deleteOne({ _id: id })).deletedCount > 0;
    },

    async progressoPorTrilha() {
      return trilhas.aggregate(PIPELINE_DO_PROGRESSO).toArray();
    },

    async progressoPorPessoa() {
      const totalDeItens = await itens.countDocuments();
      return conclusoes
        .aggregate([
          { $lookup: { from: 'itens', localField: 'item', foreignField: '_id', as: 'i' } },
          { $unwind: '$i' },
          {
            $group: {
              _id: '$usuario',
              concluidos: { $sum: 1 },
              trilhas: { $addToSet: '$i.trilha' },
              primeira: { $min: '$concluidaEm' },
              ultima: { $max: '$concluidaEm' },
            },
          },
          {
            $project: {
              _id: 0,
              usuario: '$_id',
              concluidos: 1,
              trilhas: { $size: '$trilhas' },
              percentual: { $floor: { $divide: [{ $multiply: ['$concluidos', 100] }, totalDeItens || 1] } },
              primeira: 1,
              ultima: 1,
            },
          },
          { $sort: { concluidos: -1, usuario: 1 } },
          { $project: { usuario: 1, concluidos: 1, trilhas: 1, percentual: 1, primeira: 1, ultima: 1 } },
        ])
        .toArray();
    },

    async concluintesDaTrilha(trilha) {
      const total = await itens.countDocuments({ trilha });
      if (total === 0) return [];
      return conclusoes
        .aggregate([
          { $lookup: { from: 'itens', localField: 'item', foreignField: '_id', as: 'i' } },
          { $unwind: '$i' },
          { $match: { 'i.trilha': trilha } },
          { $group: { _id: '$usuario', n: { $sum: 1 }, concluiu_em: { $max: '$concluidaEm' } } },
          { $match: { n: total } },
          { $project: { _id: 0, usuario: '$_id', concluiu_em: 1 } },
          { $sort: { concluiu_em: 1, usuario: 1 } },
        ])
        .toArray();
    },

    async ranking() {
      return conclusoes
        .aggregate([
          { $group: { _id: '$usuario', concluidos: { $sum: 1 } } },
          { $setWindowFields: { sortBy: { concluidos: -1 }, output: { posicao: { $rank: {} } } } },
          { $setWindowFields: { partitionBy: '$concluidos', output: { naPosicao: { $count: {} } } } },
          { $project: { _id: 0, posicao: 1, usuario: '$_id', concluidos: 1, empatado: { $gt: ['$naPosicao', 1] } } },
          { $sort: { posicao: 1, usuario: 1 } },
          { $project: { posicao: 1, usuario: 1, concluidos: 1, empatado: 1 } },
        ])
        .toArray();
    },

    async progressoSemanal() {
      return conclusoes
        .aggregate([
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m-%d',
                  date: { $dateTrunc: { date: { $toDate: '$concluidaEm' }, unit: 'week', startOfWeek: 'monday', timezone: 'UTC' } },
                },
              },
              concluidas: { $sum: 1 },
            },
          },
          {
            $setWindowFields: {
              sortBy: { _id: 1 },
              output: { acumulado: { $sum: '$concluidas', window: { documents: ['unbounded', 'current'] } } },
            },
          },
          { $project: { _id: 0, semana: '$_id', concluidas: 1, acumulado: 1 } },
          { $sort: { semana: 1 } },
          { $project: { semana: 1, concluidas: 1, acumulado: 1 } },
        ])
        .toArray();
    },
  };
}
