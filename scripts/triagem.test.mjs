// #324: as regras da triagem diária (36 h de alerta, 48 h de prazo) e o relatório, sem chamar o GitHub.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { comoComentarios, deFora, desdeDosFechados, ehVersaoMaior, estadoDoCi, estoque, ESTOQUE_LIMITE, excecoesDoTrivy, horasAtePrimeiraResposta, pedeAIssue, recomendacao, relatorio, resumoDaPrimeiraResposta, situacao } from './triagem.mjs';

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
  assert.deepEqual(estoque(), { total: 0, livres: 0, ocupadas: [], noLimite: false });
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

test('pedido da issue: os formatos que ocupam (R19 do #338, achado 1)', () => {
  for (const texto of ['vou  fazer', 'Vou\nfazer', 'vou pegar essa', 'quero fazer!', 'Posso fazer?', 'eu faço', 'Eu faco essa', 'Deixa comigo', 'VOU FAZER']) {
    assert.equal(pedeAIssue(texto), true, texto);
  }
});

test('pedido da issue: o que não ocupa (achado 2)', () => {
  for (const texto of ['não vou fazer agora', 'Nao quero pegar', 'vou fazer uma pergunta: pode usar Map?', 'Posso fazer uma dúvida?', 'renovou fazer', 'Posso usar o Map?', '', undefined]) {
    assert.equal(pedeAIssue(texto), false, String(texto));
  }
});

test('estoque: PR ligado ocupa; pedido de quem é de dentro não ocupa; campos nulos são livres', () => {
  const dentro = new Set(['mantenedora']);
  const e = estoque(
    [
      { number: 1, assignees: null, comments: null, closedByPullRequestsReferences: null },
      { number: 2, assignees: [], comments: [], closedByPullRequestsReferences: [{ number: 40 }] },
      { number: 3, assignees: [], comments: [{ author: { login: 'Mantenedora' }, body: 'vou fazer o merge' }] },
      { number: 4, assignees: [], comments: [{ author: { login: 'visitante' }, body: 'Quero fazer!' }] },
    ],
    dentro,
  );
  assert.equal(e.livres, 2);
  assert.deepEqual(e.ocupadas.map((i) => [i.number, i.motivo]), [[2, 'PR ligado'], [4, 'pediu para fazer']]);
});

test('relatório: a borda da meta (9 pede reposição, 10 não) e o aviso de limite', () => {
  const base = { hoje: '2026-11-24', hora: '08:00:00', fora: [], dependabot: [], excecoes: [], dependeDoResponsavel: [], agora };
  assert.match(relatorio({ ...base, entrada: { total: 12, livres: 9, ocupadas: [] } }), /\| 9 de 12 🟠 repor \|/);
  const dez = relatorio({ ...base, entrada: { total: 12, livres: 10, ocupadas: [] } });
  assert.match(dez, /\| 10 de 12 \|/);
  assert.doesNotMatch(dez, /repor|Atenção: foram lidas/);
  const muitas = Array.from({ length: ESTOQUE_LIMITE }, (_, n) => ({ number: n }));
  assert.match(relatorio({ ...base, entrada: estoque(muitas) }), new RegExp(`Atenção: foram lidas só ${ESTOQUE_LIMITE} issues de entrada`));
  assert.match(relatorio({ ...base, entrada: { total: 1, livres: 0, ocupadas: [{ number: 5, title: 'T', url: 'u', motivo: 'PR ligado' }] } }), /- \[#5\]\(u\) T \(PR ligado\)/);
});

test('pedido da issue: o veto vale por ocorrência, não pelo comentário (R19 do #340, item 1)', () => {
  assert.equal(pedeAIssue('Vou fazer! Mas antes, posso fazer uma pergunta?'), true);
  assert.equal(pedeAIssue('Não vou fazer a #12, mas vou fazer esta'), true);
  assert.equal(pedeAIssue('nao, vou fazer outra coisa'), false);
});

test('pedido da issue: citações, "eu faço" solto e as formas novas (itens 2 a 4)', () => {
  for (const texto of ['> vou fazer', 'Ela disse:\n> vou fazer\nE eu fico só olhando', 'Eu faço parte da comunidade e tenho uma dúvida', 'eu faço isso no trabalho', 'Vou fazer o curso antes', 'quero fazer uma sugestão', 'posso fazer um comentário?']) {
    assert.equal(pedeAIssue(texto), false, texto);
  }
  for (const texto of ['vou fazê-la', 'Vou pegá-la hoje', 'deixar comigo', 'Pode deixar que eu faço', 'eu\nfaço essa', '> vou fazer\nEu também! Vou pegar a próxima parte']) {
    assert.equal(pedeAIssue(texto), true, texto);
  }
});

test('pedido da issue: reconferência do #340 (vírgula do "Não," e "parte" só no "eu faço")', () => {
  for (const texto of ['Não, vou fazer sim!', 'Vou pegar a parte do backend', 'Vou fazer a parte 1 desta issue', 'eu faço sim', 'Eu faço essa amanhã']) {
    assert.equal(pedeAIssue(texto), true, texto);
  }
  for (const texto of ['nao, vou fazer outra coisa', 'nao, vou fazer a pergunta', 'Eu faço parte do grupo', 'eu faço isso no trabalho', 'não vou fazer agora']) {
    assert.equal(pedeAIssue(texto), false, texto);
  }
});

test('1ª resposta: horas até o primeiro comentário de alguém de dentro (CHAOSS)', () => {
  const criado = horasAtras(30);
  const coment = (login, h) => ({ author: { login }, createdAt: horasAtras(h) });
  assert.equal(horasAtePrimeiraResposta(criado, [coment('visitante', 28), coment('mantenedora', 20), coment('MANTENEDORA', 5)], dentro), 10);
  assert.equal(horasAtePrimeiraResposta(criado, [coment('visitante', 28)], dentro), null);
  assert.equal(horasAtePrimeiraResposta(criado, [{ author: { login: 'mantenedora' } }], dentro), null, 'sem data não conta');
  assert.equal(horasAtePrimeiraResposta(criado, undefined, dentro), null);
});

test('1ª resposta: mediana e pior caso, e o relatório marca o pior acima de 48 h', () => {
  assert.equal(resumoDaPrimeiraResposta([null, undefined]), null);
  assert.deepEqual(resumoDaPrimeiraResposta([5]), { respondidos: 1, mediana: 5, pior: 5 });
  assert.deepEqual(resumoDaPrimeiraResposta([10, 2, null, 30]), { respondidos: 3, mediana: 10, pior: 30 });
  assert.deepEqual(resumoDaPrimeiraResposta([4, 10]), { respondidos: 2, mediana: 7, pior: 10 });
  const base = { hoje: '2026-11-24', hora: '08:00:00', dependabot: [], excecoes: [], dependeDoResponsavel: [], agora };
  const item = (h) => ({ tipo: 'issue', number: 1, title: 'x', url: 'u', createdAt: horasAtras(60), author: { login: 'a' }, sit: 'respondido', horasAteResposta: h });
  assert.match(relatorio({ ...base, fora: [] }), /\| 1ª resposta nas abertas já respondidas \| nenhuma respondida ainda \|/);
  assert.match(relatorio({ ...base, fora: [item(3), item(9)] }), /\| mediana 6 h, pior 9 h \(2\) \|/);
  assert.match(relatorio({ ...base, fora: [item(50)] }), /\| mediana 50 h, pior 50 h \(1\) 🔴 \|/);
});

test('R19 QA do #358: borda das 48 h, bot, autor, fusos e review', () => {
  const base = { hoje: '2026-11-24', hora: '08:00:00', dependabot: [], excecoes: [], dependeDoResponsavel: [], agora };
  const item = (h) => ({ tipo: 'issue', number: 1, title: 'x', url: 'u', createdAt: horasAtras(60), author: { login: 'a' }, sit: 'respondido', horasAteResposta: h });
  // A borda: 48 h já é 🔴, como no situacao(); 47 h não.
  assert.match(relatorio({ ...base, fora: [item(48)] }), /pior 48 h \(1\) 🔴 \|/);
  assert.doesNotMatch(relatorio({ ...base, fora: [item(47)] }), /pior 47 h \(1\) 🔴/);
  // Bot e o próprio autor não contam como resposta (não estão em `dentro`).
  const criado = horasAtras(30);
  assert.equal(horasAtePrimeiraResposta(criado, [{ author: { login: 'github-actions[bot]' }, createdAt: horasAtras(29) }], dentro), null);
  assert.equal(horasAtePrimeiraResposta(criado, [{ author: { login: 'visitante' }, createdAt: horasAtras(29) }], dentro), null);
  // Fusos diferentes: o mesmo instante em -03:00 e em Z dá a mesma conta.
  assert.equal(horasAtePrimeiraResposta('2026-11-23T09:00:00-03:00', [{ author: { login: 'mantenedora' }, createdAt: '2026-11-23T15:00:00Z' }], dentro), 3);
  // Review de alguém de dentro é resposta, com a data do submittedAt.
  const pr = { comments: [], reviews: [{ author: { login: 'mantenedora' }, submittedAt: horasAtras(28), state: 'COMMENTED' }] };
  assert.equal(situacao(criado, comoComentarios(pr), dentro, agora), 'respondido');
  assert.equal(horasAtePrimeiraResposta(criado, comoComentarios(pr), dentro), 2);
  assert.deepEqual(comoComentarios({}), []);
  // Comentários nulos não quebram.
  assert.equal(situacao(horasAtras(10), null, dentro, agora), 'sem resposta há 10 h');
  // Sem a lista de dentro, o relatório avisa.
  assert.match(relatorio({ ...base, fora: [], semDentro: true }), /não deu para ler os membros/);
  assert.doesNotMatch(relatorio({ ...base, fora: [] }), /não deu para ler os membros/);
});

test('1ª resposta nos fechados da semana (limite do #358)', () => {
  const base = { hoje: '2026-11-24', hora: '08:00:00', fora: [], dependabot: [], excecoes: [], dependeDoResponsavel: [], agora };
  assert.doesNotMatch(relatorio(base), /fechados dos últimos/, 'sem o campo, a linha não aparece');
  assert.match(relatorio({ ...base, fechadosDaSemana: [] }), /\| 1ª resposta nos fechados dos últimos 7 dias \| nenhum respondido \|/);
  assert.match(
    relatorio({ ...base, fechadosDaSemana: [{ horasAteResposta: 2 }, { horasAteResposta: 50 }, { horasAteResposta: null }] }),
    /\| 1ª resposta nos fechados dos últimos 7 dias \| mediana 26 h, pior 50 h \(2\) 🔴; 1 fechado\(s\) sem resposta \|/,
  );
});

test('R19 QA do #359: janela de 7 dias exatos, limite, merge como resposta e fechado pelo autor', () => {
  // A janela tem hora: 7 dias antes, ao segundo, em UTC, sem depender do fuso de agora.
  assert.equal(desdeDosFechados(new Date('2026-11-24T11:48:30-03:00')), '2026-11-17T14:48:30Z');
  assert.equal(desdeDosFechados(new Date('2026-11-24T14:48:30Z')), '2026-11-17T14:48:30Z');
  // O merge por alguém de dentro é resposta, na hora do merge; por alguém de fora, não.
  const criado = horasAtras(30);
  const mesclado = { comments: [], reviews: [], mergedAt: horasAtras(26), mergedBy: { login: 'Mantenedora' } };
  assert.equal(horasAtePrimeiraResposta(criado, comoComentarios(mesclado), dentro), 4);
  assert.equal(horasAtePrimeiraResposta(criado, comoComentarios({ ...mesclado, mergedBy: { login: 'visitante' } }), dentro), null);
  assert.equal(comoComentarios({ mergedAt: null, mergedBy: null }).length, 0);
  // Fechado pelo próprio autor, sem nenhum comentário de dentro: conta como fechado sem resposta.
  const base = { hoje: '2026-11-24', hora: '08:00:00', fora: [], dependabot: [], excecoes: [], dependeDoResponsavel: [], agora };
  const fechadoPeloAutor = { horasAteResposta: horasAtePrimeiraResposta(criado, [{ author: { login: 'visitante' }, createdAt: horasAtras(29) }], dentro) };
  assert.match(relatorio({ ...base, fechadosDaSemana: [fechadoPeloAutor] }), /nenhum respondido; 1 fechado\(s\) sem resposta \|/);
  // O corte aparece na linha, no horário de Brasília, e o limite avisa.
  assert.match(relatorio({ ...base, fechadosDaSemana: [], fechadosDesde: '2026-11-17T14:48:30Z' }), /fechados dos últimos 7 dias \(desde 17\/11,? 11:48\)/);
  assert.match(relatorio({ ...base, fechadosDaSemana: [], fechadosNoLimite: true }), /⚠️ Fechados no limite \| a leitura bateu em 200/);
  assert.doesNotMatch(relatorio({ ...base, fechadosDaSemana: [] }), /Fechados no limite/);
});
