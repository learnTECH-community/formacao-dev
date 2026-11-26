// #319: o funil da hipótese, sem chamar o GitHub.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { codigoT2, funil, itemDoPr, itensDaT2, motivoProvavel, relatorio } from './hipotese.mjs';

const dentro = new Set(['mantenedora']);
const itens = ['T2.1', 'T2.2'];
const issuesT2 = [
  { number: 25, title: 'T2.1: página com HTML semântico', comments: [] },
  { number: 26, title: 'T2.2: CSS responsivo', comments: [{ author: { login: 'ana' }, body: 'Vou fazer!' }] },
  { number: 5, title: 'Cobertura T2: todos os tópicos', comments: [] },
];

test('itens da T2 no catálogo e o código num texto', () => {
  assert.deepEqual(itensDaT2('- [ ] **T2.1** a\n- [x] **T2.13** b\n- [ ] **T3.1** c\n**T2.1** de novo'), ['T2.1', 'T2.13']);
  assert.equal(codigoT2('T2.9: copiar o link'), 'T2.9');
  assert.equal(codigoT2('Novo item T2.12: tokens'), 'T2.12');
  assert.equal(codigoT2('Cobertura T2: todos'), null);
  assert.equal(codigoT2(undefined), null);
});

test('o item de um PR: pelo título ou pelo Closes de uma issue da T2', () => {
  const mapa = new Map([[26, 'T2.2']]);
  assert.equal(itemDoPr({ title: 'T2.1: semântica' }, mapa), 'T2.1');
  assert.equal(itemDoPr({ title: 'CSS do celular', body: 'Closes #26' }, mapa), 'T2.2');
  assert.equal(itemDoPr({ title: 'CSS do celular', body: 'fixes #26 e outras coisas' }, mapa), 'T2.2');
  assert.equal(itemDoPr({ title: 'Docs', body: 'Closes #311' }, mapa), null);
});

test('funil: etapas, gente de dentro e bot fora, merge depois do prazo não conta', () => {
  const prs = [
    { title: 'T2.1: semântica', author: { login: 'ana' }, mergedAt: '2026-11-30T12:00:00Z', url: 'p1' },
    { title: 'CSS', body: 'Closes #26', author: { login: 'bia' }, mergedAt: null, url: 'p2' },
    { title: 'T2.2: CSS', author: { login: 'caio' }, mergedAt: '2026-12-09T12:00:00Z', url: 'p3' },
    { title: 'T2.1: ajuste', author: { login: 'Mantenedora' }, mergedAt: '2026-11-20T12:00:00Z', url: 'p4' },
    { title: 'T2.1: bump', author: { login: 'dependabot[bot]' }, mergedAt: '2026-11-20T12:00:00Z', url: 'p5' },
  ];
  const issues = [{ author: { login: 'davi' } }, { author: { login: 'mantenedora' } }];
  const f = funil({ issues, issuesT2, prs, dentro, itens });
  assert.equal(f.chegou, 4, 'ana, bia, caio e davi');
  assert.equal(f.pediu, 1);
  assert.equal(f.abriu, 3);
  assert.equal(f.mesclou, 1, 'o merge de caio foi depois de 08/12');
  assert.deepEqual(f.concluiu, ['ana']);
  assert.equal(motivoProvavel(f), 'mesclou, mas menos pessoas que a meta: falta gente, e não clareza');
});

test('leitura "trilha": só conclui quem mesclou todos os itens', () => {
  const prs = [
    { title: 'T2.1: a', author: { login: 'ana' }, mergedAt: '2026-11-20T12:00:00Z' },
    { title: 'T2.2: b', author: { login: 'ana' }, mergedAt: '2026-11-21T12:00:00Z' },
    { title: 'T2.1: c', author: { login: 'bia' }, mergedAt: '2026-11-22T12:00:00Z' },
  ];
  const f = funil({ issues: [], issuesT2, prs, dentro, itens, leitura: 'trilha' });
  assert.deepEqual(f.concluiu, ['ana']);
  assert.deepEqual(funil({ issues: [], issuesT2, prs, dentro, itens, leitura: 'item' }).concluiu, ['ana', 'bia']);
});

test('motivo provável em cada parada do funil', () => {
  const base = { chegou: 0, pediu: 0, abriu: 0, mesclou: 0, concluiu: [] };
  assert.match(motivoProvavel(base), /ninguém chegou/);
  assert.match(motivoProvavel({ ...base, chegou: 2 }), /não pediu issue/);
  assert.match(motivoProvavel({ ...base, chegou: 2, pediu: 1 }), /não abriu PR/);
  assert.match(motivoProvavel({ ...base, chegou: 2, pediu: 1, abriu: 1 }), /não mesclou/);
  assert.equal(motivoProvavel({ ...base, concluiu: ['a', 'b', 'c'] }), 'hipótese confirmada');
});

test('relatório: a leitura, as etapas e a meta', () => {
  const f = funil({ issues: [], issuesT2, prs: [], dentro, itens });
  const texto = relatorio({ hoje: '2026-11-24', f, total: 13 });
  assert.match(texto, /Leitura de "concluir": \*\*1 item da T2 mesclado\*\*/);
  assert.match(texto, /\| 5\. Concluiu \| 0 de 3 \|/);
  assert.match(texto, /\*\*Motivo provável:\*\* pediu e não abriu PR/, 'ana pediu a #26 e não abriu PR');
  assert.match(texto, /\| ana \| T2\.2 \| — \| — \|/);
  assert.match(relatorio({ hoje: 'x', f: { ...f, leitura: 'trilha' }, total: 13 }), /a trilha inteira \(13 itens\)/);
});

test('R19 QA do #360: lista de dentro vazia, borda de 08/12, vínculo do GitHub, itens diferentes e limite', () => {
  // Sem a lista de dentro, ninguém "conclui" e o relatório avisa.
  const prsDoDono = [{ title: 'T2.1: a', author: { login: 'mantenedora' }, mergedAt: '2026-11-20T12:00:00Z' }];
  const vazio = funil({ issues: [], issuesT2, prs: prsDoDono, dentro: new Set(), itens });
  assert.equal(vazio.semDentro, true);
  assert.deepEqual(vazio.concluiu, []);
  assert.match(motivoProvavel(vazio), /não é confiável/);
  const textoVazio = relatorio({ hoje: 'x', f: vazio, total: 13 });
  assert.match(textoVazio, /não deu para ler os membros/);
  assert.match(textoVazio, /\| 5\. Concluiu \| não calculado \|/);
  // A borda: 08/12 às 23:59:59 de Brasília conta; 09/12 às 00:00 não.
  const pr = (mergedAt, login) => ({ title: 'T2.1: a', author: { login }, mergedAt });
  const borda = funil({ issues: [], issuesT2, prs: [pr('2026-12-08T23:59:59-03:00', 'ana'), pr('2026-12-09T00:00:00-03:00', 'bia')], dentro, itens });
  assert.deepEqual(borda.concluiu, ['ana']);
  // O vínculo do GitHub vem antes do corpo; "Closes: #n" também vale no corpo.
  const mapa = new Map([[26, 'T2.2'], [25, 'T2.1']]);
  assert.equal(itemDoPr({ title: 'CSS', body: 'nada', closingIssuesReferences: [{ number: 26 }] }, mapa), 'T2.2');
  assert.equal(itemDoPr({ title: 'CSS', body: 'Closes: #25' }, mapa), 'T2.1');
  // Quem pede um item e abre PR de outro conta nas duas etapas.
  const outro = funil({ issues: [], issuesT2, prs: [{ title: 'T2.1: semântica', author: { login: 'ana' }, mergedAt: null }], dentro, itens });
  const ana = outro.pessoas.find((p) => p.login === 'ana');
  assert.deepEqual([...ana.pediu], ['T2.2']);
  assert.deepEqual([...ana.abriu], ['T2.1']);
  // O limite avisa.
  assert.match(relatorio({ hoje: 'x', f: outro, total: 13, noLimite: true }), /bateu no limite/);
  assert.doesNotMatch(relatorio({ hoje: 'x', f: outro, total: 13 }), /bateu no limite/);
});
