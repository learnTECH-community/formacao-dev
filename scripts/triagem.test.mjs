// #324: as regras da triagem diária (36 h de alerta, 48 h de prazo) e o relatório, sem chamar o GitHub.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deFora, ehVersaoMaior, estadoDoCi, estoque, excecoesDoTrivy, recomendacao, relatorio, situacao } from './triagem.mjs';

const agora = new Date('2026-11-23T12:00:00-03:00');
const horasAtras = (h) => new Date(agora - h * 36e5).toISOString();
const dentro = new Set(['mantenedora']);

test('de fora: nem bot, nem membro, sem diferenciar maiúsculas', () => {
  assert.equal(deFora('Visitante', dentro), true);
  assert.equal(deFora('Mantenedora', dentro), false);
  assert.equal(deFora('dependabot[bot]', dentro), false);
  assert.equal(deFora('app/dependabot', dentro), false);
  assert.equal(deFora(undefined, dentro), false);
});

test('situação: abaixo de 36 h, alerta em 36 h, prazo perdido em 48 h', () => {
  assert.equal(situacao(horasAtras(10), [], dentro, agora), 'sem resposta há 10 h');
  assert.match(situacao(horasAtras(36), [], dentro, agora), /^🟠 sem resposta há 36 h$/);
  assert.match(situacao(horasAtras(48), [], dentro, agora), /^🔴 sem resposta há 48 h/);
});

test('situação: comentário de alguém de dentro conta como resposta; de fora, não', () => {
  assert.equal(situacao(horasAtras(60), [{ author: { login: 'MANTENEDORA' } }], dentro, agora), 'respondido');
  assert.match(situacao(horasAtras(60), [{ author: { login: 'visitante' } }], dentro, agora), /^🔴/);
});

test('CI: verde, rodando, vermelho e sem checks', () => {
  assert.equal(estadoDoCi([]), 'sem checks');
  assert.equal(estadoDoCi([{ name: 'api', conclusion: 'SUCCESS', status: 'COMPLETED' }]), 'verde');
  assert.equal(estadoDoCi([{ name: 'api', status: 'IN_PROGRESS' }]), 'rodando');
  assert.equal(estadoDoCi([{ name: 'api', conclusion: 'FAILURE' }, { name: 'app', conclusion: 'SUCCESS' }]), 'vermelho (api)');
});

test('versão maior pelo título do Dependabot', () => {
  assert.equal(ehVersaoMaior('ci(deps): Bump actions/setup-node from 4 to 7'), true);
  assert.equal(ehVersaoMaior('Bump nginxinc/nginx-unprivileged from 1.30-alpine to 1.31-alpine in /nginx'), false);
  assert.equal(ehVersaoMaior('Bump the painel-menores group with 2 updates'), false);
});

test('recomendação: CI vermelho vem antes de tudo', () => {
  assert.equal(recomendacao('vermelho (api)', true), 'investigar o CI antes');
  assert.equal(recomendacao('verde', true), 'ler as notas de migração e mesclar');
  assert.equal(recomendacao('verde', false), 'mesclar');
  assert.equal(recomendacao('rodando', false), 'esperar o CI');
});

test('exceções do .trivyignore e dias que faltam', () => {
  const texto = '# motivo: #312\nCVE-2026-1 exp:2026-12-03\nCVE-2026-2\n';
  assert.deepEqual(excecoesDoTrivy(texto, agora), [{ id: 'CVE-2026-1', exp: '2026-12-03', faltam: 11 }]);
});

test('relatório: resume, ordena e marca o que pede ação', () => {
  const texto = relatorio({
    hoje: '2026-11-23',
    hora: '12:00:00',
    fora: [
      { tipo: 'PR', number: 9, title: 'Novo', url: 'u9', createdAt: horasAtras(5), author: { login: 'b' }, sit: 'sem resposta há 5 h' },
      { tipo: 'issue', number: 8, title: 'Velha', url: 'u8', createdAt: horasAtras(50), author: { login: 'a' }, sit: '🔴 sem resposta há 50 h (passou das 48 h)' },
    ],
    dependabot: [{ number: 305, title: 'Bump x from 4 to 7', url: 'u', createdAt: horasAtras(24 * 5), statusCheckRollup: [{ name: 'api', conclusion: 'SUCCESS', status: 'COMPLETED' }] }],
    excecoes: [{ id: 'CVE-2026-1', exp: '2026-11-28', faltam: 5 }],
    dependeDoResponsavel: [],
    agora,
  });
  assert.match(texto, /\| Contribuições de fora abertas \| 2 \|/);
  assert.match(texto, /\| Sem resposta há 36 h ou mais \| 1 \(1 passaram das 48 h\) \|/);
  assert.match(texto, /\| Dependabot com mais de 2 dias \| 1 \|/);
  assert.match(texto, /\| Exceções do Trivy vencendo em até 7 dias \| 1 \|/);
  assert.ok(texto.indexOf('#8') < texto.indexOf('#9'), 'o mais antigo vem primeiro');
  assert.match(texto, /\| \[#305\]\(u\) \| Bump x from 4 to 7 \| 5 d \| verde \| sim \| ler as notas de migração e mesclar \|/);
  assert.match(texto, /5 dia\(s\) 🟠/);
});

test('estoque: atribuída ou com "vou fazer" está ocupada; o texto da issue não conta', () => {
  const issues = [
    { number: 1, title: 'Livre', url: 'u1', assignees: [], comments: [] },
    { number: 2, title: 'Atribuída', url: 'u2', assignees: [{ login: 'a' }], comments: [] },
    { number: 3, title: 'Pegou', url: 'u3', assignees: [], comments: [{ body: 'Oi! Vou fazer esta.' }] },
    { number: 4, title: 'Só pergunta', url: 'u4', assignees: [], comments: [{ body: 'Posso usar o Map?' }] },
  ];
  const e = estoque(issues);
  assert.equal(e.total, 4);
  assert.equal(e.livres, 2);
  assert.deepEqual(e.ocupadas.map((i) => i.number), [2, 3]);
  assert.deepEqual(estoque(), { total: 0, livres: 0, ocupadas: [] });
});

test('relatório: estoque abaixo da meta pede reposição e lista quem está trabalhando', () => {
  const base = { hoje: '2026-11-24', hora: '08:00:00', fora: [], dependabot: [], excecoes: [], dependeDoResponsavel: [], agora };
  const baixo = relatorio({ ...base, entrada: { total: 9, livres: 8, ocupadas: [{ number: 7, title: 'T0.6', url: 'u7' }] } });
  assert.match(baixo, /\| Issues de entrada livres \(meta: 10 ou mais\) \| 8 de 9 🟠 repor \|/);
  assert.match(baixo, /- \[#7\]\(u7\) T0\.6/);
  const ok = relatorio({ ...base, entrada: { total: 21, livres: 21, ocupadas: [] } });
  assert.match(ok, /\| 21 de 21 \|/);
  assert.doesNotMatch(ok, /alguém trabalhando/);
  assert.doesNotMatch(relatorio(base), /Issues de entrada livres/, 'sem o campo, a linha não aparece');
});
