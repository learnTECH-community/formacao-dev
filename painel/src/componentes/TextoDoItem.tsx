// Texto de um item com os trechos entre crases em <code>.
// O React escapa todo texto: nada do catálogo vira HTML.
import { pedacosDoTexto } from '../catalogo';

export function TextoDoItem({ texto }: { texto: string }) {
  return pedacosDoTexto(texto).map((p, i) => (p.codigo ? <code key={i}>{p.texto}</code> : p.texto));
}
