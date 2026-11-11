// Vite: servidor de desenvolvimento e build do painel (ADR 002), com o React (T4.6).
// O CATALOGO.md da raiz é a única fonte dos dados: o plugin abaixo o serve em
// desenvolvimento e o copia para o build, sem guardar cópia em painel/.
import { copyFileSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const catalogo = fileURLToPath(new URL('./CATALOGO.md', import.meta.url));

function servirCatalogo() {
  return {
    name: 'servir-catalogo',
    configureServer(server) {
      server.watcher.add(catalogo);
      server.middlewares.use('/CATALOGO.md', (_pedido, resposta) => {
        resposta.setHeader('Content-Type', 'text/markdown; charset=utf-8');
        resposta.end(readFileSync(catalogo));
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'CATALOGO.md', source: readFileSync(catalogo, 'utf8') });
    },
    // T4.3: hospedagem estática sem rotas (como o Pages) devolve o 404.html para
    // /trilha/T2; sendo uma cópia do index.html, o React abre a rota certa.
    writeBundle({ dir }) {
      copyFileSync(`${dir}/index.html`, `${dir}/404.html`);
    },
  };
}

export default defineConfig({
  root: 'painel',
  // Rotas com caminho próprio (/trilha/T2) pedem base absoluta. Para publicar numa
  // subpasta (como /formacao-dev/ no Pages), defina BASE_DO_PAINEL no build.
  base: process.env.BASE_DO_PAINEL ?? '/',
  plugins: [react(), servirCatalogo()],
  build: { outDir: '../dist', emptyOutDir: true },
  test: {
    include: ['src/**/*.test.{js,ts,tsx}'],
    setupFiles: ['src/teste/preparar.ts'],
    // T7.5: cobertura dos cálculos do painel (npm run cobertura). Abaixo de 90%, falha.
    coverage: {
      provider: 'v8',
      include: ['src/progresso.ts', 'src/catalogo.ts', 'src/filtro.ts', 'src/filtroNoEndereco.ts'],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
      reporter: ['text', 'html', 'json-summary'],
      reportsDirectory: '../cobertura',
    },
  },
});
