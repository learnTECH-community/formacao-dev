-- T6.7: restrições no banco (CHECK, NOT NULL, UNIQUE e chaves estrangeiras).
-- O SQLite não acrescenta CHECK numa tabela que já existe: cada tabela é recriada
-- com as restrições, os dados são copiados e a antiga sai. A 001 não é editada.
-- O migrador desliga as chaves estrangeiras durante a troca e confere tudo no fim.

CREATE TABLE trilhas_nova (
  codigo  TEXT PRIMARY KEY
          CHECK (codigo GLOB 'T[0-9]*' AND codigo NOT GLOB 'T*[^0-9]*'),
  nome    TEXT NOT NULL CHECK (length(trim(nome)) > 0),
  posicao INTEGER NOT NULL CHECK (posicao > 0)
);
INSERT INTO trilhas_nova (codigo, nome, posicao) SELECT codigo, nome, posicao FROM trilhas;
DROP TABLE trilhas;
ALTER TABLE trilhas_nova RENAME TO trilhas;

CREATE TABLE itens_nova (
  codigo  TEXT PRIMARY KEY
          -- "Tn.m": só T, dígitos e um ponto, e começa pelo código da trilha.
          CHECK (codigo GLOB 'T[0-9]*.[0-9]*' AND codigo NOT GLOB '*[^T0-9.]*'
                 AND length(codigo) - length(replace(codigo, '.', '')) = 1
                 AND substr(codigo, 1, length(trilha) + 1) = trilha || '.'),
  trilha  TEXT NOT NULL REFERENCES trilhas (codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
  texto   TEXT NOT NULL CHECK (length(trim(texto)) > 0),
  marcado INTEGER NOT NULL DEFAULT 0 CHECK (marcado IN (0, 1)),
  posicao INTEGER NOT NULL CHECK (posicao > 0)
);
INSERT INTO itens_nova (codigo, trilha, texto, marcado, posicao) SELECT codigo, trilha, texto, marcado, posicao FROM itens;
DROP TABLE itens;
ALTER TABLE itens_nova RENAME TO itens;
CREATE INDEX idx_itens_trilha ON itens (trilha, posicao);

CREATE TABLE conclusoes_nova (
  id           INTEGER PRIMARY KEY,
  item         TEXT NOT NULL REFERENCES itens (codigo) ON UPDATE CASCADE ON DELETE RESTRICT,
  usuario      TEXT NOT NULL CHECK (length(usuario) BETWEEN 1 AND 39 AND usuario NOT GLOB '*[^A-Za-z0-9-]*'),
  pr           TEXT NOT NULL CHECK (pr GLOB 'https://github.com/*/*/pull/[0-9]*'),
  -- ISO 8601 em UTC, como o toISOString() do JavaScript. "IS" e não "=": data
  -- inválida faz o strftime devolver NULL, e "x = NULL" deixaria passar.
  concluida_em TEXT NOT NULL CHECK (concluida_em IS strftime('%Y-%m-%dT%H:%M:%fZ', concluida_em)),
  CONSTRAINT uma_conclusao_por_pessoa UNIQUE (item, usuario)
);
INSERT INTO conclusoes_nova (id, item, usuario, pr, concluida_em) SELECT id, item, usuario, pr, concluida_em FROM conclusoes;
DROP TABLE conclusoes;
ALTER TABLE conclusoes_nova RENAME TO conclusoes;
CREATE INDEX idx_conclusoes_usuario ON conclusoes (usuario);
