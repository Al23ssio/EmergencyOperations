-- Emergency Operations - schema del database
-- Cancella le tabelle se esistono gia, cosi il file si puo rilanciare
DROP TABLE IF EXISTS segnalazione, categoria, area, utente, ruolo CASCADE;

-- RUOLO
CREATE TABLE ruolo (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(50) NOT NULL UNIQUE,
  descrizione TEXT
);

-- UTENTE
CREATE TABLE utente (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  nome_cognome  VARCHAR(100),
  attivo        BOOLEAN NOT NULL DEFAULT TRUE,
  id_ruolo      INT NOT NULL REFERENCES ruolo(id)
);

-- AREA
CREATE TABLE area (
  id            SERIAL PRIMARY KEY,
  nome          VARCHAR(100) NOT NULL,
  codice_comune VARCHAR(10)
);

-- CATEGORIA
CREATE TABLE categoria (
  id          SERIAL PRIMARY KEY,
  nome        VARCHAR(100) NOT NULL UNIQUE,
  descrizione TEXT
);

-- SEGNALAZIONE
CREATE TABLE segnalazione (
  id                 SERIAL PRIMARY KEY,
  titolo             VARCHAR(200) NOT NULL,
  descrizione        TEXT,
  indirizzo          VARCHAR(255),
  latitudine         NUMERIC(9,6),
  longitudine        NUMERIC(9,6),
  priorita           VARCHAR(10) NOT NULL DEFAULT 'media'
                     CHECK (priorita IN ('bassa','media','alta','urgente')),
  stato              VARCHAR(20) NOT NULL DEFAULT 'ricevuta'
                     CHECK (stato IN ('ricevuta','valutata','assegnata','in_intervento','risolta','chiusa')),
  canale             VARCHAR(20)
                     CHECK (canale IN ('telefono','email','web','altro')),
  classificazione_ai VARCHAR(100),
  creata_il          TIMESTAMP NOT NULL DEFAULT now(),
  chiusa_il          TIMESTAMP,
  id_utente          INT NOT NULL REFERENCES utente(id),
  id_area            INT NOT NULL REFERENCES area(id),
  id_categoria       INT REFERENCES categoria(id)
);

-- DATI INIZIALI DI PROVA

INSERT INTO ruolo (nome, descrizione) VALUES
  ('segnalatore',        'Operatore di front-office: registra gli eventi'),
  ('operatore_centrale', 'Classifica, assegna e monitora'),
  ('squadra',            'Aggiorna lo stato e inserisce note'),
  ('responsabile',       'Consulta la situazione complessiva'),
  ('amministratore',     'Gestisce utenti e configurazioni');

INSERT INTO utente (username, email, password_hash, nome_cognome, id_ruolo) VALUES
  ('mrossi', 'mario.rossi@example.com', 'da_sostituire', 'Mario Rossi', 2);

INSERT INTO area (nome, codice_comune) VALUES
  ('Centro', 'L378'),
  ('Periferia Nord', 'L378');

INSERT INTO categoria (nome, descrizione) VALUES
  ('Viabilita',     'Strade e buche'),
  ('Dissesto',      'Piccoli dissesti del terreno'),
  ('Allagamento',   'Allagamenti e acqua'),
  ('Albero caduto', 'Alberi o rami caduti'),
  ('Guasto',        'Guasti a impianti e infrastrutture');