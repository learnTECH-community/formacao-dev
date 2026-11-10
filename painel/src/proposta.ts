// T4.12: validação do formulário "Propor item" com Zod e o link da issue no GitHub.
// Nada é enviado pelo painel: o resultado é um endereço do GitHub, que a pessoa abre.
import { z } from 'zod';

export const NOVA_ISSUE = 'https://github.com/learnTECH-community/formacao-dev/issues/new';

/** Linhas não vazias dos critérios, sem o "- [ ]" que a pessoa possa ter escrito. */
export function linhasDosCriterios(texto: string): string[] {
  return texto
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*]\s*)?(?:\[[ x]\]\s*)?/i, '').trim())
    .filter(Boolean);
}

export function esquemaDaProposta(trilhas: readonly string[]) {
  return z.object({
    trilha: z.string().refine((t) => trilhas.includes(t), { message: 'Escolha a trilha do catálogo.' }),
    roadmap: z
      .string()
      .trim()
      .regex(/^https:\/\/roadmap\.sh\/[\w-]+\/?$/, { message: 'Use o link da trilha no roadmap.sh, como https://roadmap.sh/react.' }),
    topico: z
      .string()
      .trim()
      .min(3, { message: 'Escreva o nome do tópico (pelo menos 3 letras).' })
      .max(80, { message: 'Só o nome do tópico, com até 80 caracteres. Não copie o texto do site.' }),
    tarefa: z
      .string()
      .trim()
      .min(20, { message: 'Descreva a tarefa prática no painel (pelo menos 20 caracteres).' })
      .max(300, { message: 'Resuma a tarefa em até 300 caracteres.' }),
    criterios: z.string().refine(
      (t) => {
        const n = linhasDosCriterios(t).length;
        return n >= 3 && n <= 5;
      },
      { message: 'Escreva de 3 a 5 critérios, um por linha.' },
    ),
  });
}

export type Proposta = z.infer<ReturnType<typeof esquemaDaProposta>>;
export type CampoDaProposta = keyof Proposta;
export type ErrosDaProposta = Partial<Record<CampoDaProposta, string>>;

/** Valida e devolve a proposta pronta ou a primeira mensagem de erro de cada campo. */
export function validarProposta(
  dados: Record<CampoDaProposta, string>,
  trilhas: readonly string[],
): { ok: true; proposta: Proposta } | { ok: false; erros: ErrosDaProposta } {
  const resultado = esquemaDaProposta(trilhas).safeParse(dados);
  if (resultado.success) return { ok: true, proposta: resultado.data };
  const erros: ErrosDaProposta = {};
  for (const problema of resultado.error.issues) {
    const campo = problema.path[0];
    if (typeof campo === 'string' && campo in dados && !erros[campo as CampoDaProposta]) {
      erros[campo as CampoDaProposta] = problema.message;
    }
  }
  return { ok: false, erros };
}

/** Link para abrir a issue no modelo "Novo item", com os campos preenchidos. */
export function linkDaIssue(p: Proposta): string {
  const parametros = new URLSearchParams({
    template: 'novo-item.yml',
    title: `Novo item ${p.trilha}: ${p.topico}`,
    trilha: p.trilha,
    roadmap: p.roadmap,
    topico: p.topico,
    item: p.tarefa,
    criterios: linhasDosCriterios(p.criterios)
      .map((c) => `- [ ] ${c}`)
      .join('\n'),
  });
  return `${NOVA_ISSUE}?${parametros.toString()}`;
}
