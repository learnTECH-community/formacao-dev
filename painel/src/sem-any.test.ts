// T3.4: o código do painel não usa "any" escrito. O "any" implícito é barrado pelo
// `tsc --noEmit` com `strict` (npm run typecheck, no CI).
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const pasta = fileURLToPath(new URL('./', import.meta.url));
// Todos os arquivos de src/, também nas subpastas (componentes/ e outras).
const todos = readdirSync(pasta, { recursive: true, encoding: 'utf8' }).map((f) => f.replaceAll('\\', '/'));
const arquivos = todos.filter((f) => /\.tsx?$/.test(f));

describe('sem any', () => {
  it('há arquivos TypeScript no painel e nenhum JavaScript sobrou em src/', () => {
    expect(arquivos.length).toBeGreaterThan(5);
    expect(arquivos.some((f) => f.endsWith('.tsx'))).toBe(true);
    expect(todos.filter((f) => /\.jsx?$/.test(f))).toEqual([]);
  });

  it.each(arquivos)('%s não tem "any" como tipo', (arquivo) => {
    const texto = readFileSync(`${pasta}/${arquivo}`, 'utf8')
      .replace(/\/\/.*$/gm, '') // tira comentários de linha
      .replace(/'[^'\n]*'|"[^"\n]*"/g, "''"); // tira textos entre aspas
    expect(texto).not.toMatch(/[:<,|(]\s*any\b|\bas\s+any\b|\bany\[\]/);
  });
});
