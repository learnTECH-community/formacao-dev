// T3.4: o código do painel não usa "any" escrito. O "any" implícito é barrado pelo
// `tsc --noEmit` com `strict` (npm run typecheck, no CI).
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';

const pasta = new URL('./', import.meta.url);
const arquivos = readdirSync(pasta).filter((f) => f.endsWith('.ts'));

describe('sem any', () => {
  it('há arquivos TypeScript no painel e nenhum JavaScript sobrou em src/', () => {
    expect(arquivos.length).toBeGreaterThan(5);
    expect(readdirSync(pasta).filter((f) => f.endsWith('.js'))).toEqual([]);
  });

  it.each(arquivos)('%s não tem "any" como tipo', (arquivo) => {
    const texto = readFileSync(new URL(arquivo, pasta), 'utf8')
      .replace(/\/\/.*$/gm, '') // tira comentários de linha
      .replace(/'[^'\n]*'|"[^"\n]*"/g, "''"); // tira textos entre aspas
    expect(texto).not.toMatch(/[:<,|(]\s*any\b|\bas\s+any\b|\bany\[\]/);
  });
});
