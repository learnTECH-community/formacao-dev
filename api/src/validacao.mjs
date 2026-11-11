// T5.2: validação da entrada no servidor, com zod e mensagens em português.
// Um esquema por rota; a mesma regra vale para o painel e para qualquer outro cliente.
import { z } from 'zod';
import { ErroDaApi } from './erros.mjs';

export const CODIGO_DO_ITEM = /^T\d+\.\d+$/;
// Regras do GitHub para nome de usuário: até 39 letras, números ou hífens,
// sem hífen no começo, no fim ou dois seguidos.
export const USUARIO_DO_GITHUB = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
export const LINK_DO_PR = /^https:\/\/github\.com\/[A-Za-z0-9-]+\/[A-Za-z0-9._-]+\/pull\/\d+$/;

const texto = (campo) => ({ error: (i) => (i.input === undefined ? `${campo} é obrigatório.` : `${campo} precisa ser texto.`) });

export const esquemaDaConclusao = z.strictObject(
  {
    item: z.string(texto('item')).regex(CODIGO_DO_ITEM, { error: 'item precisa estar no formato Tn.m, como T2.3.' }),
    usuario: z
      .string(texto('usuario'))
      .regex(USUARIO_DO_GITHUB, { error: 'usuario precisa ser um nome de usuário do GitHub: até 39 letras, números ou hífens.' }),
    pr: z
      .string(texto('pr'))
      .regex(LINK_DO_PR, { error: 'pr precisa ser o link de um PR, como https://github.com/dono/repo/pull/12.' }),
  },
  {
    error: (i) => {
      if (i.code === 'unrecognized_keys') return `Campo desconhecido: ${i.keys.join(', ')}.`;
      if (i.code === 'invalid_type') return 'O corpo precisa ser um objeto JSON.';
      return undefined;
    },
  },
);

/** Valida e devolve os dados limpos, ou lança 400 com a lista de campos e o motivo de cada um. */
export function validar(esquema, dados) {
  const resultado = esquema.safeParse(dados);
  if (resultado.success) return resultado.data;
  const erros = resultado.error.issues.map((i) => ({ campo: i.path.join('.') || '(corpo)', mensagem: i.message }));
  throw new ErroDaApi('validacao', `${erros.length === 1 ? 'Um campo está inválido' : `${erros.length} campos estão inválidos`}: confira "erros".`, {
    erros,
  });
}
