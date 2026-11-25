// T10.1: o detector de segredos acha credenciais falsas e não reclama de texto comum.
// Os exemplos são montados por partes, para este arquivo não parecer um segredo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { arquivosDoIndice, conferirArquivo, conferirGitignore, conferirRepositorio, lerParaConferir } from './segredos.mjs';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const FALSOS = {
  'token do GitHub': 'const t = "' + 'ghp' + '_' + 'a'.repeat(36) + '";',
  'chave de acesso da AWS': 'AKIA' + 'ABCDEFGHIJKLMNOP',
  'chave privada': '-----BEGIN ' + 'PRIVATE KEY-----',
  'URL de banco com senha': 'MONGO_URL=mongodb+srv://' + 'usuario-ficticio:senha-ficticia' + '@exemplo.mongodb.net',
  'chave de API live': 'sk' + '_live_' + 'x'.repeat(20),
  // #364: os padrões novos, também montados por partes.
  'chave do Google': 'const k = "' + 'AI' + 'za' + 'B'.repeat(35) + '";',
  'token do npm': '//registry.npmjs.org/:_authToken=' + 'npm' + '_' + 'c'.repeat(36),
  'chave de LLM': 'ANTHROPIC_API_KEY=' + 'sk' + '-ant-' + 'd'.repeat(40),
  'webhook do Discord': 'https://' + 'discord.com/api/webhooks/' + '123456789' + '/' + 'e'.repeat(30),
  'webhook do Slack': 'https://' + 'hooks.slack.com/services/' + 'T000/B000/' + 'f'.repeat(24),
};

// #364: as variantes de padrões que já existiam.
test('acha a AWS temporária (ASIA), a chave privada encriptada e a PGP', () => {
  for (const [linha, tipo] of [
    ['ASIA' + 'ABCDEFGHIJKLMNOP', 'chave de acesso da AWS'],
    ['-----BEGIN ' + 'ENCRYPTED PRIVATE KEY-----', 'chave privada'],
    ['-----BEGIN ' + 'PGP PRIVATE KEY BLOCK-----', 'chave privada'],
    ['sk' + '-proj-' + 'g'.repeat(40), 'chave de LLM'],
    ['sk' + '-' + 'h'.repeat(48), 'chave de LLM'],
  ]) {
    assert.deepEqual(conferirArquivo('a.txt', linha), [`a.txt:1: parece ${tipo}`], linha.slice(0, 12));
  }
});

test('#364: falsos positivos dos padrões novos passam', () => {
  const texto = [
    'O prefixo AIza aparece no texto, sem a chave.',
    'AI' + 'za' + 'curto123',
    'npm' + '_' + 'curto',
    'use sk-' + 'ant- para a Anthropic',
    'sk' + '-' + 'curta-demais',
    'https://discord.com/channels/123/456',
    'https://hooks.slack.com/',
    'ASIA é um continente; AKIA é um prefixo.',
  ].join('\n');
  assert.deepEqual(conferirArquivo('docs/x.md', texto), []);
});

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

test('a varredura falha fechada: só o arquivo apagado é pulado; outro erro de leitura vira achado', () => {
  const erro = (code) => () => {
    throw Object.assign(new Error(code), { code });
  };
  assert.deepEqual(lerParaConferir('a.txt', () => 'conteúdo'), { texto: 'conteúdo' });
  assert.deepEqual(lerParaConferir('apagado.txt', erro('ENOENT')), { pular: true });
  assert.deepEqual(lerParaConferir('travado.txt', erro('EACCES')), { achado: 'travado.txt: não deu para ler (EACCES); confira à mão' });
  assert.match(lerParaConferir('x', () => { throw new Error('sem código'); }).achado, /x: não deu para ler \(erro sem código\)/);
  // #364: a mensagem do erro não vai para o achado, porque pode trazer texto do arquivo.
  assert.doesNotMatch(lerParaConferir('x', () => { throw new Error('conteúdo secreto'); }).achado, /conteúdo secreto/);
});

test('o repositório real também não tem arquivo ilegível', () => {
  assert.deepEqual(conferirRepositorio().ilegiveis, []);
});

test('arquivosDoIndice pula os submódulos (gitlinks)', () => {
  const saida = ['100644 aaa111 0\tREADME.md', '160000 bbb222 0\tvendor/sub', '100755 ccc333 0\tscripts/x.sh', ''].join('\0');
  assert.deepEqual(arquivosDoIndice(saida), ['README.md', 'scripts/x.sh']);
});

// R19 QA do #363: o script de verdade, num repositório Git temporário (a lição do #362).
const SCRIPT = fileURLToPath(new URL('./segredos.mjs', import.meta.url));
function repositorio(arquivos) {
  const raiz = mkdtempSync(join(tmpdir(), 'segredos-'));
  const git = (...args) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd: raiz, stdio: 'pipe' });
  git('init', '-q');
  for (const [nome, texto] of Object.entries({ '.gitignore': '.env\n', ...arquivos })) {
    mkdirSync(join(raiz, nome, '..'), { recursive: true });
    writeFileSync(join(raiz, nome), texto);
  }
  git('add', '-A', '-f');
  git('commit', '-q', '-m', 'x');
  return raiz;
}
const rodar = (raiz) => spawnSync(process.execPath, [SCRIPT], { cwd: raiz, encoding: 'utf8' });

test('script: limpo e apagado saem com 0; pasta no lugar do arquivo (EISDIR) sai com 1', () => {
  const limpo = repositorio({ 'a.txt': 'nada aqui' });
  assert.equal(rodar(limpo).status, 0);
  rmSync(join(limpo, 'a.txt'));
  assert.equal(rodar(limpo).status, 0, 'apagado da cópia: pula o conteúdo');
  const pasta = repositorio({ 'b.txt': 'texto' });
  rmSync(join(pasta, 'b.txt'));
  mkdirSync(join(pasta, 'b.txt'));
  const r = rodar(pasta);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Não deu para ler 1 arquivo\(s\); confira à mão:\nb\.txt: não deu para ler \(EISDIR\)/);
  assert.doesNotMatch(r.stderr, /revogada/, 'a dica de revogar só vale para segredo');
});

test('script: um .env versionado e apagado da cópia ainda falha, pelo nome', () => {
  const raiz = repositorio({ 'config/.env': 'X=1' });
  rmSync(join(raiz, 'config/.env'));
  const r = rodar(raiz);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /config\/\.env: arquivo \.env versionado/);
});

test('script: sem .gitignore, o achado diz que ele não existe', () => {
  const raiz = repositorio({ 'a.txt': 'nada' });
  execFileSync('git', ['rm', '-q', '--cached', '.gitignore'], { cwd: raiz });
  rmSync(join(raiz, '.gitignore'));
  const r = rodar(raiz);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /\.gitignore: não existe/);
});

test('#364: zip e pdf versionados viram ilegíveis; link simbólico é tratado à parte; conferirRepositorio empurra o ilegível', () => {
  const raiz = repositorio({ 'docs/manual.pdf': '%PDF-1.4 falso', 'pacote.zip': 'PK falso', 'a.txt': 'nada' });
  // Um link simbólico versionado para um alvo que não existe: entra no índice com o modo 120000.
  const alvo = execFileSync('git', ['hash-object', '-w', '--stdin'], { cwd: raiz, input: 'nao-existe.txt' }).toString().trim();
  execFileSync('git', ['update-index', '--add', '--cacheinfo', `120000,${alvo},link-quebrado`], { cwd: raiz });
  const { achados, ilegiveis } = conferirRepositorio(raiz);
  assert.deepEqual(achados, []);
  assert.deepEqual(ilegiveis.sort(), [
    'docs/manual.pdf: arquivo compactado ou PDF versionado; a varredura não abre, confira à mão',
    'pacote.zip: arquivo compactado ou PDF versionado; a varredura não abre, confira à mão',
  ]);
  const r = rodar(raiz);
  assert.equal(r.status, 1);
  assert.match(r.stderr, /Não deu para ler 2 arquivo\(s\)/);
  assert.doesNotMatch(r.stderr, /link-quebrado/, 'o link não é seguido nem vira ENOENT');
});

test('#364: no script de verdade, cada segredo falso sai com 1 e o log mostra só arquivo:linha:tipo, sem o valor', () => {
  const linhas = Object.values(FALSOS);
  const raiz = repositorio({ 'src/falsos.mjs': linhas.join('\n') + '\n' });
  const r = rodar(raiz);
  assert.equal(r.status, 1);
  for (const tipo of Object.keys(FALSOS)) assert.match(r.stderr, new RegExp(String.raw`src/falsos\.mjs:\d+: parece ${tipo}`), tipo);
  for (const valor of ['a'.repeat(36), 'B'.repeat(35), 'c'.repeat(36), 'd'.repeat(40), 'e'.repeat(30), 'f'.repeat(24), 'ABCDEFGHIJKLMNOP']) {
    assert.ok(!r.stderr.includes(valor), `o valor ${valor.slice(0, 4)}… não aparece no log`);
  }
});

// R19 QA do #366, item 1 (severidade 3): os limites de tamanho, com o exato e ±1.
test('#366: limites de tamanho dos padrões, no exato e em ±1', () => {
  const acha = (linha) => conferirArquivo('a.txt', linha).length > 0;
  const casos = [
    ['AI' + 'za' + 'x'.repeat(34), false], ['AI' + 'za' + 'x'.repeat(35), true], ['AI' + 'za' + 'x'.repeat(36), false],
    ['npm' + '_' + 'y'.repeat(35), false], ['npm' + '_' + 'y'.repeat(36), true], ['npm' + '_' + 'y'.repeat(37), false],
    ['sk' + '-' + 'z'.repeat(31), false], ['sk' + '-' + 'z'.repeat(32), true],
    ['AKIA' + 'A'.repeat(15), false], ['AKIA' + 'A'.repeat(16), true], ['AKIA' + 'A'.repeat(17), false],
  ];
  for (const [linha, esperado] of casos) assert.equal(acha(linha), esperado, `${linha.slice(0, 5)}… com ${linha.length} caracteres`);
  // Item 6: "key_AIza..." também conta, porque o _ antes do AIza não impede.
  assert.equal(acha('key_' + 'AI' + 'za' + 'x'.repeat(35)), true);
});

// Itens 2, 3 e 5 do QA e critérios 2 e 3 da #364 (SecOps).
test('#366: chaves públicas e placeholders passam; rediss, amqp e os Discord alternativos são achados', () => {
  const negativos = [
    '-----BEGIN ' + 'PUBLIC KEY-----',
    '-----BEGIN ' + 'PGP PUBLIC KEY BLOCK-----',
    'https://' + 'hooks.slack.com/services/' + 'XXX/YYY/ZZZ',
    'https://' + 'discord.com/api/webhooks/' + '123/abc',
  ];
  assert.deepEqual(conferirArquivo('docs/exemplo.md', negativos.join('\n')), []);
  for (const [linha, tipo] of [
    ['REDIS_URL=rediss://' + 'usuario:senha-ficticia' + '@cache.exemplo:6380', 'URL de banco com senha'],
    ['amqps://' + 'usuario:senha-ficticia' + '@fila.exemplo/vhost', 'URL de banco com senha'],
    ['https://' + 'discordapp.com/api/webhooks/' + '123456789/' + 'k'.repeat(30), 'webhook do Discord'],
    ['https://' + 'canary.discord.com/api/webhooks/' + '123456789/' + 'k'.repeat(30), 'webhook do Discord'],
  ]) {
    assert.deepEqual(conferirArquivo('a.txt', linha), [`a.txt:1: parece ${tipo}`], linha.slice(0, 20));
  }
});

test('#366: arquivos de chave versionados são achados pelo nome; .pub e outros passam', () => {
  for (const caminho of ['deploy/servidor.pem', 'certs/site.key', 'home/.ssh/id_rsa', 'id_ed25519', '.npmrc', 'cert.P12']) {
    assert.match(conferirArquivo(caminho, '').join(), /arquivo de chave ou credencial versionado/, caminho);
  }
  for (const caminho of ['id_rsa.pub', 'docs/keyboard.md', 'chaves.md', 'monkey.txt']) {
    assert.deepEqual(conferirArquivo(caminho, ''), [], caminho);
  }
});

test('#366: formatos zip do Office e do Java também são "confira à mão"', () => {
  const raiz = repositorio({ 'docs/plano.DOCX': 'PK falso', 'lib/app.jar': 'PK falso' });
  assert.equal(conferirRepositorio(raiz).ilegiveis.length, 2);
});
