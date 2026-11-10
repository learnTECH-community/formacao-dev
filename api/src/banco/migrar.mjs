// T6.3: migrações versionadas. Cada arquivo api/migracoes/NNN_nome.sql roda uma
// vez só, em ordem, dentro de uma transação, e fica registrado na tabela
// schema_migracoes. Migração já aplicada nunca é editada: mudança vira arquivo novo.
// Uso: node src/banco/migrar.mjs [caminho do banco]   (padrão: CAMINHO_DO_BANCO ou dados/painel.db)
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { abrirBanco, caminhoDoBanco } from './conexao.mjs';

export const PASTA_DAS_MIGRACOES = new URL('../../migracoes/', import.meta.url);
const NOME = /^(\d{3})_[a-z0-9_]+\.sql$/;

/** Migrações da pasta, em ordem de versão. */
export function listarMigracoes(pasta = PASTA_DAS_MIGRACOES) {
  const arquivos = readdirSync(pasta).filter((a) => a.endsWith('.sql'));
  const fora = arquivos.filter((a) => !NOME.test(a));
  if (fora.length) throw new Error(`migração fora do padrão NNN_nome.sql: ${fora.join(', ')}`);
  const migracoes = arquivos
    .map((arquivo) => ({ versao: Number(arquivo.slice(0, 3)), arquivo, sql: readFileSync(new URL(arquivo, pasta), 'utf8') }))
    .sort((a, b) => a.versao - b.versao);
  migracoes.forEach((m, i) => {
    if (m.versao !== i + 1) throw new Error(`versão ${String(i + 1).padStart(3, '0')} faltando ou repetida (achei ${m.arquivo})`);
  });
  return migracoes;
}

/**
 * Aplica as migrações que faltam. Devolve as versões aplicadas agora.
 * @param {import('node:sqlite').DatabaseSync} banco
 */
export function migrar(banco, { pasta = PASTA_DAS_MIGRACOES, relogio = () => new Date() } = {}) {
  banco.exec(`CREATE TABLE IF NOT EXISTS schema_migracoes (
    versao INTEGER PRIMARY KEY,
    arquivo TEXT NOT NULL,
    aplicada_em TEXT NOT NULL
  )`);
  const aplicadas = new Set(banco.prepare('SELECT versao FROM schema_migracoes').all().map((l) => l.versao));
  const registrar = banco.prepare('INSERT INTO schema_migracoes (versao, arquivo, aplicada_em) VALUES (?, ?, ?)');
  const agora = [];
  for (const m of listarMigracoes(pasta)) {
    if (aplicadas.has(m.versao)) continue;
    // Uma migração que recria tabela precisa das chaves estrangeiras desligadas;
    // a checagem volta e é conferida no fim (PRAGMA foreign_key_check).
    banco.exec('PRAGMA foreign_keys = OFF');
    banco.exec('BEGIN');
    try {
      banco.exec(m.sql);
      const quebradas = banco.prepare('PRAGMA foreign_key_check').all();
      if (quebradas.length) throw new Error(`${quebradas.length} linha(s) com chave estrangeira quebrada`);
      registrar.run(m.versao, m.arquivo, relogio().toISOString());
      banco.exec('COMMIT');
    } catch (erro) {
      banco.exec('ROLLBACK');
      throw new Error(`migração ${m.arquivo} falhou: ${erro.message}`, { cause: erro });
    } finally {
      banco.exec('PRAGMA foreign_keys = ON');
    }
    agora.push(m.versao);
  }
  return agora;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const caminho = process.argv[2] ?? caminhoDoBanco();
  const banco = abrirBanco(caminho);
  const versoes = migrar(banco);
  console.log(versoes.length ? `aplicadas: ${versoes.join(', ')} em ${caminho}` : `nada a aplicar em ${caminho}`);
  banco.close();
}
