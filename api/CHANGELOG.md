# Changelog da API

Mudanças da API do Painel de Formação, da mais nova para a mais antiga. A política de versão e de desativação está em [docs/api.md](../docs/api.md#versões-e-desativação).

Tipos de mudança: **Novo**, **Mudou**, **Antiga** (vai sair, com data), **Removido**, **Corrigido**.

## v1 · 10/11/2026

- **Novo:** `GET /v1/health`, que lê o repositório de dados (T5.1).
- **Novo:** `GET /v1/catalogo`, com as trilhas, os itens e quem fez cada item (T5.1).
- **Novo:** `POST /v1/conclusoes`, com validação e erros em Problem Details (T5.2, T5.9).
- **Antiga:** `GET /v1/catalogo.md` devolve o texto do `CATALOGO.md` para o painel atual. Antiga desde 10/11/2026; sai do ar em 08/02/2027. Use `GET /v1/catalogo` (T5.15).
