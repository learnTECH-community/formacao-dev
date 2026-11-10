-- T6.1: trilhas, itens e conclusões, com chaves e índices.
-- Uma trilha tem muitos itens; um item tem muitas conclusões (uma por pessoa).

CREATE TABLE trilhas (
  codigo  TEXT PRIMARY KEY,          -- "T2"
  nome    TEXT NOT NULL,
  posicao INTEGER NOT NULL           -- ordem no CATALOGO.md
);

CREATE TABLE itens (
  codigo  TEXT PRIMARY KEY,          -- "T2.3"
  trilha  TEXT NOT NULL REFERENCES trilhas (codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
  texto   TEXT NOT NULL,
  marcado INTEGER NOT NULL DEFAULT 0, -- 1 se está com [x] no CATALOGO.md
  posicao INTEGER NOT NULL
);

-- Busca dos itens de uma trilha, na ordem do catálogo.
CREATE INDEX idx_itens_trilha ON itens (trilha, posicao);

CREATE TABLE conclusoes (
  id           INTEGER PRIMARY KEY,   -- alias do rowid: cresce sozinho
  item         TEXT NOT NULL REFERENCES itens (codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
  usuario      TEXT NOT NULL,         -- nome de usuário do GitHub
  pr           TEXT NOT NULL,         -- link do PR
  concluida_em TEXT NOT NULL,         -- ISO 8601, em UTC
  -- T6.5: a mesma pessoa conclui o mesmo item uma vez só. O índice desta
  -- restrição também atende a busca de conclusões por item.
  CONSTRAINT uma_conclusao_por_pessoa UNIQUE (item, usuario)
);

-- Busca das conclusões de uma pessoa.
CREATE INDEX idx_conclusoes_usuario ON conclusoes (usuario);
