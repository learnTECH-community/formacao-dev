// T9.11: dados fictícios em qualquer repositório (MongoDB, memória ou SQLite), pela
// mesma interface que a API usa. Serve para o banco do compose, que é MongoDB.
// Os dados são os mesmos do npm run semear (T6.3): pessoas inventadas e PRs de um
// repositório de exemplo. Rodar de novo não duplica nada (a conclusão é única por
// item e pessoa).
// Uso, com REPOSITORIO=mongo e MONGO_URL: node src/banco/semear-repositorio.mjs
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CAMINHO_PADRAO, trilhasDoTexto } from '../catalogo.mjs';
import { conclusoesFicticias } from './semear.mjs';

/** Leva o catálogo e grava as conclusões fictícias. Devolve o total e quantas eram novas. */
export async function semearRepositorio(repositorio, { textoDoCatalogo = readFileSync(process.env.CAMINHO_CATALOGO || CAMINHO_PADRAO, 'utf8'), semente } = {}) {
  const trilhas = trilhasDoTexto(textoDoCatalogo);
  await repositorio.gravarCatalogo(trilhas);
  let novas = 0;
  for (const conclusao of conclusoesFicticias(trilhas, { semente })) {
    if ((await repositorio.registrarConclusao(conclusao)).criada) novas++;
  }
  const { conclusoes } = await repositorio.saude();
  return { conclusoes, novas };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (!process.env.MONGO_URL) {
    console.error('Defina MONGO_URL (e MONGO_BANCO, padrão painel). Para o SQLite, use npm run semear.');
    process.exit(1);
  }
  const { MongoClient } = await import('mongodb');
  const { criarRepositorioMongo } = await import('../repositorios/mongo.mjs');
  const cliente = await new MongoClient(process.env.MONGO_URL, { serverSelectionTimeoutMS: 10_000 }).connect();
  const nome = process.env.MONGO_BANCO || 'painel';
  try {
    const { conclusoes, novas } = await semearRepositorio(await criarRepositorioMongo(cliente.db(nome)));
    console.log(`MongoDB, banco ${nome}: ${conclusoes} conclusões fictícias (${novas} novas)`);
  } finally {
    await cliente.close();
  }
}
