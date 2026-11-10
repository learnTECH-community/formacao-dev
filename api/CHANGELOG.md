# Changelog da API

Mudanças da API do Painel de Formação, da mais nova para a mais antiga. A política de versão e de desativação está em [docs/api.md](../docs/api.md#versões-e-desativação).

Tipos de mudança: **Novo**, **Mudou**, **Antiga** (vai sair, com data), **Removido**, **Corrigido**.

## v1 · 10/11/2026

- **Novo:** `GET /v1/health`, que lê o repositório de dados (T5.1).
- **Novo:** `GET /v1/catalogo`, com as trilhas, os itens e quem fez cada item (T5.1).
- **Novo:** `POST /v1/conclusoes`, com validação e erros em Problem Details (T5.2, T5.9).
- **Novo:** `GET /v1/itens`, com filtros por trilha e situação e paginação, e `GET /v1/itens/{codigo}` (T5.12).
- **Novo:** log em JSON com `X-Request-Id` (T5.10).
- **Novo:** cache do catálogo com tempo de vida, `ETag`, `Cache-Control` e 304 (T5.7).
- **Antiga:** `GET /v1/catalogo.md` devolve o texto do `CATALOGO.md` para o painel atual. Antiga desde 10/11/2026; sai do ar em 08/02/2027. Use `GET /v1/catalogo` (T5.15).
