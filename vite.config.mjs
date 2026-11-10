// Vite: servidor de desenvolvimento e build do painel (ADR 002), com o React (T4.6).
// O CATALOGO.md da raiz é a única fonte dos dados: o plugin abaixo o serve em
// desenvolvimento e o copia para o build, sem guardar cópia em painel/.
import { readFileSync } from 'node:fs';
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
  };
}

export default defineConfig({
  root: 'painel',
  base: './',
  plugins: [react(), servirCatalogo()],
  build: { outDir: '../dist', emptyOutDir: true },
  test: { include: ['src/**/*.test.{js,ts,tsx}'], setupFiles: ['src/teste/preparar.ts'] },
});
