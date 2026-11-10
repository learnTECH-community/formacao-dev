// T10.1: o detector de segredos acha credenciais falsas e não reclama de texto comum.
// Os exemplos são montados por partes, para este arquivo não parecer um segredo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conferirArquivo, conferirGitignore, conferirRepositorio } from './segredos.mjs';

const FALSOS = {
  'token do GitHub': 'const t = "' + 'ghp' + '_' + 'a'.repeat(36) + '";',
  'chave de acesso da AWS': 'AKIA' + 'ABCDEFGHIJKLMNOP',
  'chave privada': '-----BEGIN ' + 'PRIVATE KEY-----',
  'URL de banco com senha': 'MONGO_URL=mongodb+srv://' + 'usuario-ficticio:senha-ficticia' + '@exemplo.mongodb.net',
  'chave de API live': 'sk' + '_live_' + 'x'.repeat(20),
};

for (const [tipo, linha] of Object.entries(FALSOS)) {
  test(`acha ${tipo}`, () => {
    const achados = conferirArquivo('src/config.mjs', `// início\n${linha}\n`);
    assert.equal(achados.length, 1);
    assert.match(achados[0], new RegExp(`^src/config\\.mjs:2: parece ${tipo}`));
  });
}

test('texto comum, URL de banco sem senha e nomes de variável passam', () => {
  const texto = ['MONGO_URL=mongodb://127.0.0.1:27017', 'formato: mongodb+srv://' + '<usuario>:<senha>' + '@<cluster>/painel', 'const token = process.env.GITHUB_TOKEN;', 'ghp_ curto não é token'].join('\n');
  assert.deepEqual(conferirArquivo('src/app.mjs', texto), []);
});

test('.env versionado é recusado; .env.example passa', () => {
  assert.match(conferirArquivo('api/.env', 'PORTA=4320')[0], /arquivo \.env versionado/);
  assert.match(conferirArquivo('.env.production', '')[0], /arquivo \.env versionado/);
  assert.deepEqual(conferirArquivo('api/.env.example', 'PORTA=4320\nGITHUB_TOKEN=\n'), []);
});

test('no .env.example, variável de segredo com valor é recusada', () => {
  const achados = conferirArquivo('api/.env.example', 'PORTA=4320\nGITHUB_CLIENT_SECRET=abc123\nCHAVE_DA_SESSAO=xyz\n');
  assert.deepEqual(achados, [
    'api/.env.example:2: GITHUB_CLIENT_SECRET tem valor no .env.example; deixe só o nome',
    'api/.env.example:3: CHAVE_DA_SESSAO tem valor no .env.example; deixe só o nome',
  ]);
});

test('o .gitignore precisa ignorar o .env', () => {
  assert.deepEqual(conferirGitignore('node_modules/\n.env\n'), []);
  assert.deepEqual(conferirGitignore('node_modules/\n'), ['.gitignore: falta ignorar o .env']);
});

test('o repositório não tem segredo versionado', () => {
  const { arquivos, achados } = conferirRepositorio();
  assert.ok(arquivos > 100);
  assert.deepEqual(achados, []);
});
