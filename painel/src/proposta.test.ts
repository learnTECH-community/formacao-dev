// T4.12: validação da proposta e o link da issue.
import { describe, it, expect } from 'vitest';
import { linhasDosCriterios, linkDaIssue, validarProposta } from './proposta';

const trilhas = ['T2', 'T4'];
const valida = {
  trilha: 'T4',
  roadmap: 'https://roadmap.sh/react',
  topico: 'Portals',
  tarefa: 'Mostrar o detalhe do item numa janela modal com portal.',
  criterios: '- [ ] Modal com createPortal\nFoco volta ao botão\n\n* Esc fecha',
};

describe('validarProposta', () => {
  it('aceita uma proposta completa', () => {
    const r = validarProposta(valida, trilhas);
    expect(r.ok).toBe(true);
  });

  it('devolve uma mensagem em português por campo inválido', () => {
    const r = validarProposta({ trilha: 'T9', roadmap: 'https://exemplo.com', topico: 'a', tarefa: 'curta', criterios: 'só um' }, trilhas);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erros).toEqual({
      trilha: 'Escolha a trilha do catálogo.',
      roadmap: 'Use o link da trilha no roadmap.sh, como https://roadmap.sh/react.',
      topico: 'Escreva o nome do tópico (pelo menos 3 letras).',
      tarefa: 'Descreva a tarefa prática no painel (pelo menos 20 caracteres).',
      criterios: 'Escreva de 3 a 5 critérios, um por linha.',
    });
  });

  it('mais de 5 critérios ou tópico longo demais não passam', () => {
    const r = validarProposta({ ...valida, topico: 'x'.repeat(81), criterios: 'a\nb\nc\nd\ne\nf' }, trilhas);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(Object.keys(r.erros).sort()).toEqual(['criterios', 'topico']);
  });
});

describe('linkDaIssue', () => {
  it('aponta para o modelo "Novo item" do GitHub com os campos preenchidos', () => {
    const r = validarProposta(valida, trilhas);
    if (!r.ok) throw new Error('esperava válida');
    const url = new URL(linkDaIssue(r.proposta));
    expect(url.origin + url.pathname).toBe('https://github.com/learnTECH-community/formacao-dev/issues/new');
    expect(url.searchParams.get('template')).toBe('novo-item.yml');
    expect(url.searchParams.get('title')).toBe('Novo item T4: Portals');
    expect(url.searchParams.get('topico')).toBe('Portals');
    expect(url.searchParams.get('criterios')).toBe('- [ ] Modal com createPortal\n- [ ] Foco volta ao botão\n- [ ] Esc fecha');
  });
});

describe('linhasDosCriterios', () => {
  it('tira marcadores e linhas vazias', () => {
    expect(linhasDosCriterios('- [x] um\n\n  * dois \n[ ] três')).toEqual(['um', 'dois', 'três']);
  });
});
