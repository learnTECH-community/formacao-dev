// T5.15: versão da API e aviso de rota antiga.
// Todas as rotas ficam sob /v1. Uma rota marcada como antiga responde com:
//   Deprecation: @<segundos>         (RFC 9745: desde quando é antiga)
//   Sunset: <data HTTP>              (RFC 8594: quando sai do ar)
//   Link: <substituta>; rel="successor-version"
// A política (prazo de aviso de 90 dias) está em docs/api.md.

export const VERSAO = 'v1';
export const PRAZO_DE_AVISO_EM_DIAS = 90;

/** Rotas antigas: desde quando, até quando e qual usar no lugar. */
export const OBSOLETAS = {
  '/v1/catalogo.md': { desde: '2026-11-10', remocao: '2027-02-08', substituta: '/v1/catalogo' },
};

/** Middleware que põe os cabeçalhos de rota antiga. */
export function obsoleta({ desde, remocao, substituta }) {
  const segundos = Math.floor(Date.parse(`${desde}T00:00:00Z`) / 1000);
  const sunset = new Date(`${remocao}T00:00:00Z`).toUTCString();
  return (_pedido, resposta, seguir) => {
    resposta.set('Deprecation', `@${segundos}`);
    resposta.set('Sunset', sunset);
    resposta.set('Link', `<${substituta}>; rel="successor-version"`);
    seguir();
  };
}

/** Confere a política: a remoção vem pelo menos PRAZO_DE_AVISO_EM_DIAS depois do aviso. */
export function prazoCumprido({ desde, remocao }) {
  const dias = (Date.parse(remocao) - Date.parse(desde)) / 86_400_000;
  return dias >= PRAZO_DE_AVISO_EM_DIAS;
}
