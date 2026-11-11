# Acesso mínimo e backup do banco (T6.11)

## Acesso mínimo

O SQLite não tem usuários: quem abre o arquivo pode tudo. No estudo, a separação fica nas **conexões**:

| Conexão | Quem usa | O que pode |
|---|---|---|
| De migração | `npm run migrar`, `npm run semear` e a subida da API (`src/servidor.mjs`, que abre, migra e fecha) | Tudo: criar, mudar e apagar tabelas |
| Da API | As rotas, pelo repositório SQLite | Só `SELECT`, `INSERT`, `UPDATE`, `DELETE` e transações |

A trava da conexão da API é o autorizador do SQLite (`DatabaseSync.setAuthorizer`, do Node 24.10; no CI, esses testes rodam num passo com o Node 24), em [`api/src/banco/acesso.mjs`](../api/src/banco/acesso.mjs). Ele recusa `CREATE`, `DROP`, `ALTER`, `ATTACH` e `PRAGMA` que muda configuração. Num Node sem o autorizador (o 22, por exemplo), a API sobe sem a trava e diz isso na linha de início.

O teste [`api/test/acesso.test.mjs`](../api/test/acesso.test.mjs) confere que a conexão da API recusa 9 comandos de estrutura, que o repositório funciona com ela, e que as migrações só rodam pela outra.

### Num banco com usuários (Postgres)

A mesma ideia vira dois papéis. Os comandos abaixo são o modelo; as senhas ficam só nas variáveis da hospedagem, nunca aqui:

```sql
-- Papel dono das tabelas: só as migrações entram com ele.
CREATE ROLE painel_migracao LOGIN;          -- a senha é definida na hospedagem
CREATE SCHEMA painel AUTHORIZATION painel_migracao;

-- Papel da API: lê e grava linhas, e nada mais.
CREATE ROLE painel_api LOGIN;               -- a senha é definida na hospedagem
GRANT USAGE ON SCHEMA painel TO painel_api;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA painel TO painel_api;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA painel TO painel_api;
ALTER DEFAULT PRIVILEGES FOR ROLE painel_migracao IN SCHEMA painel
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO painel_api;
-- Sem CREATE no schema: a API não cria nem apaga tabela.
```

Criar esses papéis num banco de verdade depende da hospedagem, que é do responsável (issue #230).

## Backup e restauração

O backup usa a API de backup online do SQLite (`backup()` do `node:sqlite`): copia o banco página por página, com a API no ar.

```bash
cd api
npm run backup -- dados/backup-2026-11-10.db                              # copia o CAMINHO_DO_BANCO
npm run restaurar -- dados/backup-2026-11-10.db dados/restaurado.db       # restaura num banco vazio e confere
```

A restauração:
1. recusa um destino que já existe (só restaura num banco vazio);
2. conta as linhas de `trilhas`, `itens`, `conclusoes` e `schema_migracoes` no backup;
3. copia para o destino e conta de novo;
4. falha se alguma contagem não bater ou se alguma chave estrangeira estiver quebrada.

O teste restaura o banco com os dados fictícios (161 itens, 288 conclusões), compara as contagens e confere que o progresso por trilha do restaurado é igual ao do original.

Os arquivos de backup ficam em `api/dados/`, que não vai para o Git.
