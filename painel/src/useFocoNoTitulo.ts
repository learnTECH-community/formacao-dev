// T4.3: ao trocar de página, o título da aba muda e o foco vai para o título do conteúdo
// novo, para o leitor de tela anunciar a página. Na primeira carga, o foco fica onde está.
import { useEffect, useState, type RefObject } from 'react';
import { useLocation } from 'react-router';

export const NOME_DO_SITE = 'Painel de Formação · learnTECH Community';

export function useTituloDaAba(titulo?: string): void {
  useEffect(() => {
    document.title = titulo ? `${titulo} · ${NOME_DO_SITE}` : NOME_DO_SITE;
  }, [titulo]);
}

/**
 * Leva o foco ao título quando a página foi aberta por um link do próprio painel
 * (não na primeira carga) e cada vez que `pedido` aumenta (depois de "Tentar de novo").
 */
export function useFocoNoTitulo(titulo: RefObject<HTMLElement | null>, pedido: number): void {
  const { key } = useLocation();
  // Guardado na montagem: mudar o filtro (que muda o endereço) não deve mover o foco.
  const [chegouPorLink] = useState(key !== 'default');

  useEffect(() => {
    if (chegouPorLink) titulo.current?.focus();
  }, [chegouPorLink, titulo]);

  useEffect(() => {
    if (pedido > 0) titulo.current?.focus();
  }, [pedido, titulo]);
}
