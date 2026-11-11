/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base da API (T5), como "http://127.0.0.1:4320". Sem ela, o painel lê o CATALOGO.md. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
