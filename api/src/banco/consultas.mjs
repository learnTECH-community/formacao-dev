// Consultas versionadas em api/consultas/*.sql (T6.2). O texto é do repositório,
// nunca de quem chama a API; os valores entram por parâmetro.
import { readFileSync } from 'node:fs';

export const PASTA_DAS_CONSULTAS = new URL('../../consultas/', import.meta.url);

export function consulta(nome) {
  if (!/^[a-z_]+$/.test(nome)) throw new Error(`nome de consulta inválido: ${nome}`);
  return readFileSync(new URL(`${nome}.sql`, PASTA_DAS_CONSULTAS), 'utf8');
}
