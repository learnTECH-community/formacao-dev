// T4.4: preparação dos testes de componente (ambiente jsdom).
// Os testes das funções puras rodam no ambiente node e não precisam disto.
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';

if (typeof document !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  // O jsdom não tem matchMedia; o tema do sistema nos testes é o claro.
  if (!window.matchMedia) {
    window.matchMedia = (consulta: string): MediaQueryList => ({
      matches: false,
      media: consulta,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    });
  }
  afterEach(() => cleanup());
}
