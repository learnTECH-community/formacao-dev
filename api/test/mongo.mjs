// Apoio dos testes do repositório MongoDB (T6.12).
// Com MONGO_URL (no CI, o serviço mongo do job api), cada repositório de teste usa
// um banco novo. Sem MONGO_URL (como no Windows, sem Docker), os testes do Mongo
// ficam marcados como pulados, com o motivo; no CI eles rodam, e o log é conferido
// para não ter "# skipped".
import { after } from 'node:test';
import { randomUUID } from 'node:crypto';
import { MongoClient } from 'mongodb';
import { criarRepositorioMongo } from '../src/repositorios/mongo.mjs';

export const MONGO_URL = process.env.MONGO_URL;
export const SEM_MONGO = MONGO_URL ? false : 'sem MONGO_URL: os testes do MongoDB rodam no job api do CI';

let cliente;
const bancos = [];

after(async () => {
  if (!cliente) return;
  for (const nome of bancos) await cliente.db(nome).dropDatabase();
  await cliente.close();
});

/** Um banco vazio, só deste teste. */
export async function bancoMongoDeTeste() {
  cliente ??= await new MongoClient(MONGO_URL, { serverSelectionTimeoutMS: 10_000 }).connect();
  const nome = `painel_teste_${randomUUID().slice(0, 8)}`;
  bancos.push(nome);
  return cliente.db(nome);
}

export async function repositorioMongoDeTeste() {
  return criarRepositorioMongo(await bancoMongoDeTeste());
}
