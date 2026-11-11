// Endereço que não é página do painel.
import { useRef } from 'react';
import { Link } from 'react-router';
import type { PropsDePagina } from '../rotas';
import { useFocoNoTitulo, useTituloDaAba } from '../useFocoNoTitulo';

export function NaoEncontrada({ pedidoDeFoco }: Pick<PropsDePagina, 'pedidoDeFoco'>) {
  const titulo = useRef<HTMLHeadingElement>(null);
  useTituloDaAba('Página não encontrada');
  useFocoNoTitulo(titulo, pedidoDeFoco);
  return (
    <section className="faixa" aria-labelledby="titulo-nao-encontrada">
      <h2 id="titulo-nao-encontrada" tabIndex={-1} ref={titulo}>
        Página não encontrada
      </h2>
      <p>
        <Link to="/">Voltar ao painel</Link>
      </p>
    </section>
  );
}
