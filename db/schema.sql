-- =====================================================================
-- Emergency Operations - schema del database (PostgreSQL 16)
-- Allineato a docs/data-model.md (modello logico).
--
-- Viene eseguito AUTOMATICAMENTE da Docker la prima volta che il
-- container del database parte con un volume vuoto
-- (vedi docker-compose.yml -> /docker-entrypoint-initdb.d).
--
-- ATTENZIONE: se lo rilanci a mano cancella tutte le tabelle e i dati.
-- =====================================================================

DROP TABLE IF EXISTS
  suggerimento_ai, storico_modifica, nota, assegnazione, allegato,
  segnalazione, categoria, area, squadra_utente, squadra, utente, ruolo
CASCADE;

-- ---------------------------------------------------------------------
-- RUOLO(id, nome, descrizione)
-- ---------------------------------------------------------------------
CREATE TABLE ruolo (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(50) NOT NULL UNIQUE,
  descrizione TEXT
);

-- ---------------------------------------------------------------------
-- UTENTE(id, username, email, password_hash, nome_cognome, attivo, id_ruolo)
-- ---------------------------------------------------------------------
CREATE TABLE utente (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nome_cognome  VARCHAR(100),
  attivo        BOOLEAN NOT NULL DEFAULT TRUE,
  id_ruolo      INT NOT NULL REFERENCES ruolo(id)
);

-- ---------------------------------------------------------------------
-- SQUADRA(id, nome, attiva)
-- ---------------------------------------------------------------------
CREATE TABLE squadra (
  id     SERIAL PRIMARY KEY,
  nome   VARCHAR(100) NOT NULL UNIQUE,
  attiva BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------------
-- SQUADRA_UTENTE(id_squadra, id_utente)
-- Tabella ponte: un utente puo far parte di piu squadre e viceversa.
-- ---------------------------------------------------------------------
CREATE TABLE squadra_utente (
  id_squadra INT NOT NULL REFERENCES squadra(id) ON DELETE CASCADE,
  id_utente  INT NOT NULL REFERENCES utente(id)  ON DELETE CASCADE,
  PRIMARY KEY (id_squadra, id_utente)
);

-- ---------------------------------------------------------------------
-- AREA(id, nome, codice_comune)
-- ---------------------------------------------------------------------
CREATE TABLE area (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(100) NOT NULL,
  codice_comune VARCHAR(10)
);

-- ---------------------------------------------------------------------
-- CATEGORIA(id, nome, descrizione)
-- ---------------------------------------------------------------------
CREATE TABLE categoria (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(100) NOT NULL UNIQUE,
  descrizione TEXT
);

-- ---------------------------------------------------------------------
-- SEGNALAZIONE(id, titolo, descrizione, indirizzo, latitudine, longitudine,
--              priorita, stato, canale, classificazione_ai, creata_il,
--              chiusa_il, id_utente, id_area, id_categoria)
-- ---------------------------------------------------------------------
CREATE TABLE segnalazione (
  id                 SERIAL PRIMARY KEY,
  titolo             VARCHAR(200) NOT NULL,
  descrizione        TEXT,
  indirizzo          VARCHAR(255),
  latitudine         NUMERIC(9,6) CHECK (latitudine  BETWEEN -90  AND 90),
  longitudine        NUMERIC(9,6) CHECK (longitudine BETWEEN -180 AND 180),
  priorita           VARCHAR(10) NOT NULL DEFAULT 'media'
                     CHECK (priorita IN ('bassa','media','alta','urgente')),
  stato              VARCHAR(20) NOT NULL DEFAULT 'ricevuta'
                     CHECK (stato IN ('ricevuta','valutata','assegnata','in_intervento','risolta','chiusa')),
  canale             VARCHAR(20)
                     CHECK (canale IN ('telefono','email','web','altro')),
  classificazione_ai VARCHAR(100),
  creata_il          TIMESTAMPTZ NOT NULL DEFAULT now(),
  chiusa_il          TIMESTAMPTZ,
  id_utente          INT NOT NULL REFERENCES utente(id),
  id_area            INT NOT NULL REFERENCES area(id),
  id_categoria       INT REFERENCES categoria(id),
  -- la data di chiusura c'e solo se la segnalazione e chiusa
  CHECK ((stato = 'chiusa') = (chiusa_il IS NOT NULL))
);

-- ---------------------------------------------------------------------
-- ALLEGATO(id, nome_file, percorso, mime_type, dimensione, caricato_il,
--          id_segnalazione)
-- Il file vero sta nello storage foto: qui salviamo solo i metadati.
-- ---------------------------------------------------------------------
CREATE TABLE allegato (
  id              SERIAL PRIMARY KEY,
  nome_file       VARCHAR(255) NOT NULL,
  percorso        VARCHAR(500) NOT NULL,
  mime_type       VARCHAR(100) NOT NULL,
  dimensione      BIGINT NOT NULL CHECK (dimensione >= 0),   -- in byte
  caricato_il     TIMESTAMPTZ NOT NULL DEFAULT now(),
  id_segnalazione INT NOT NULL REFERENCES segnalazione(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- ASSEGNAZIONE(id, assegnata_il, terminata_il, id_squadra, id_utente,
--              id_segnalazione)
-- id_utente = operatore di centrale che ha disposto l'assegnazione.
-- ---------------------------------------------------------------------
CREATE TABLE assegnazione (
  id              SERIAL PRIMARY KEY,
  assegnata_il    TIMESTAMPTZ NOT NULL DEFAULT now(),
  terminata_il    TIMESTAMPTZ,
  id_squadra      INT NOT NULL REFERENCES squadra(id),
  id_utente       INT NOT NULL REFERENCES utente(id),
  id_segnalazione INT NOT NULL REFERENCES segnalazione(id) ON DELETE CASCADE,
  CHECK (terminata_il IS NULL OR terminata_il >= assegnata_il)
);

-- ---------------------------------------------------------------------
-- NOTA(id, testo, creata_il, id_utente, id_segnalazione, id_allegato)
-- id_allegato e facoltativo (una nota puo includere una foto).
-- ---------------------------------------------------------------------
CREATE TABLE nota (
  id              SERIAL PRIMARY KEY,
  testo           TEXT NOT NULL,
  creata_il       TIMESTAMPTZ NOT NULL DEFAULT now(),
  id_utente       INT NOT NULL REFERENCES utente(id),
  id_segnalazione INT NOT NULL REFERENCES segnalazione(id) ON DELETE CASCADE,
  id_allegato     INT REFERENCES allegato(id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------
-- STORICO_MODIFICA(id, tipo_evento, campo, valore_precedente, valore_nuovo,
--                  timestamp, id_utente, id_segnalazione)
-- Traccia chi ha cambiato cosa e quando (requisito 8 del cliente).
-- ---------------------------------------------------------------------
CREATE TABLE storico_modifica (
  id                SERIAL PRIMARY KEY,
  tipo_evento       VARCHAR(30) NOT NULL,   -- es. cambio_stato, cambio_priorita, assegnazione
  campo             VARCHAR(50),
  valore_precedente TEXT,
  valore_nuovo      TEXT,
  "timestamp"       TIMESTAMPTZ NOT NULL DEFAULT now(),
  id_utente         INT NOT NULL REFERENCES utente(id),
  id_segnalazione   INT NOT NULL REFERENCES segnalazione(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- SUGGERIMENTO_AI(id, priorita_suggerita, confidenza, modello, accettato,
--                 creato_il, id_segnalazione, id_categoria,
--                 id_utente_validatore)
-- accettato = NULL finche l'operatore non conferma o rifiuta.
-- ---------------------------------------------------------------------
CREATE TABLE suggerimento_ai (
  id                   SERIAL PRIMARY KEY,
  priorita_suggerita   VARCHAR(10)
                       CHECK (priorita_suggerita IN ('bassa','media','alta','urgente')),
  confidenza           NUMERIC(4,3) CHECK (confidenza BETWEEN 0 AND 1),
  modello              VARCHAR(100) NOT NULL,
  accettato            BOOLEAN,
  creato_il            TIMESTAMPTZ NOT NULL DEFAULT now(),
  id_segnalazione      INT NOT NULL REFERENCES segnalazione(id) ON DELETE CASCADE,
  id_categoria         INT NOT NULL REFERENCES categoria(id),
  id_utente_validatore INT REFERENCES utente(id)
);

-- ---------------------------------------------------------------------
-- INDICI sulle chiavi esterne piu usate nelle ricerche
-- ---------------------------------------------------------------------
CREATE INDEX idx_segnalazione_stato     ON segnalazione (stato);
CREATE INDEX idx_segnalazione_area      ON segnalazione (id_area);
CREATE INDEX idx_segnalazione_categoria ON segnalazione (id_categoria);
CREATE INDEX idx_allegato_segnalazione  ON allegato (id_segnalazione);
CREATE INDEX idx_assegnazione_segn      ON assegnazione (id_segnalazione);
CREATE INDEX idx_nota_segnalazione      ON nota (id_segnalazione);
CREATE INDEX idx_storico_segnalazione   ON storico_modifica (id_segnalazione);
CREATE INDEX idx_suggerimento_segn      ON suggerimento_ai (id_segnalazione);

-- =====================================================================
-- DATI INIZIALI DI PROVA
-- =====================================================================

INSERT INTO ruolo (nome, descrizione) VALUES
  ('segnalatore',        'Operatore di front-office: registra gli eventi'),
  ('operatore_centrale', 'Classifica, assegna e monitora'),
  ('squadra',            'Aggiorna lo stato e inserisce note'),
  ('responsabile',       'Consulta la situazione complessiva'),
  ('amministratore',     'Gestisce utenti e configurazioni');

INSERT INTO utente (username, email, password_hash, nome_cognome, id_ruolo) VALUES
  ('mrossi',   'mario.rossi@example.com',   'da_sostituire', 'Mario Rossi',   2),
  ('lbianchi', 'luca.bianchi@example.com',  'da_sostituire', 'Luca Bianchi',  3),
  ('gverdi',   'giulia.verdi@example.com',  'da_sostituire', 'Giulia Verdi',  3);

INSERT INTO squadra (nome) VALUES
  ('Squadra Nord'),
  ('Squadra Centro');


INSERT INTO squadra_utente (id_squadra, id_utente) VALUES
  (1, 2),
  (2, 3);
  
INSERT INTO area (nome, codice_comune) VALUES
  ('Centro', 'L378'),
  ('Periferia Nord', 'L378'),
  ('Periferia Sud', 'L378'),
  ('Zona Industriale / Est', 'L378'),
  ('Frazioni collinari / Ovest', 'L378'),
  ('A22 / Rete Viaria Principale', 'L378');

INSERT INTO categoria (nome, descrizione) VALUES
  ('Viabilita',     'Strade e buche'),
  ('Dissesto',      'Piccoli dissesti del terreno'),
  ('Allagamento',   'Allagamenti e acqua'),
  ('Albero caduto', 'Alberi o rami caduti'),
  ('Incendio', 'Incendi a impianti e infrastrutture'),
  ('Guasto',        'Guasti a impianti e infrastrutture');
