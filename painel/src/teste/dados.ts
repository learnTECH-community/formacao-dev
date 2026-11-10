// Dados de exemplo para os testes de componente. Fictícios, sem pessoa real.
import type { Trilha } from '../tipos';

export const TRILHAS: Trilha[] = [
  {
    codigo: 'T1',
    nome: 'Git e GitHub',
    roadmaps: [{ nome: 'Git e GitHub', url: 'https://roadmap.sh/git-github' }],
    itens: [
      { codigo: 'T1.1', texto: 'Trabalhar com o fluxo `feature/data`.', feito: true },
      { codigo: 'T1.2', texto: 'Abrir uma issue.', feito: false },
    ],
  },
  {
    codigo: 'T2',
    nome: 'Frontend base',
    roadmaps: [
      { nome: 'Frontend', url: 'https://roadmap.sh/frontend' },
      { nome: 'CSS', url: 'https://roadmap.sh/css' },
    ],
    itens: [{ codigo: 'T2.1', texto: 'Montar a página.', feito: false }],
  },
];

/** O mesmo catálogo, como texto do CATALOGO.md. */
export const CATALOGO_MD = [
  '# Catálogo',
  '',
  '## T1 · Git e GitHub',
  'Roadmap de referência: [Git e GitHub](https://roadmap.sh/git-github)',
  '',
  '- [x] **T1.1** Trabalhar com o fluxo `feature/data`.',
  '- [ ] **T1.2** Abrir uma issue.',
  '',
  '## T2 · Frontend base',
  'Roadmaps de referência: [Frontend](https://roadmap.sh/frontend) · [CSS](https://roadmap.sh/css)',
  '',
  '- [ ] **T2.1** Montar a página.',
  '',
].join('\n');

/** Catálogo com trilha e sem item nenhum. */
export const CATALOGO_VAZIO = '# Catálogo\n\n## T0 · Fundamentos\n';

/** Resposta HTTP de texto, para simular o fetch. */
export function resposta(corpo: string, status = 200): Response {
  return new Response(corpo, { status, headers: { 'Content-Type': 'text/markdown' } });
}
