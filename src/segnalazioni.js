// Operazioni sulle segnalazioni: crea, leggi, aggiorna, note, assegnazioni e storico
const express = require('express');
const pool = require('./db'); // o '../db' a seconda della struttura cartelle
const { autentica, autorizza, RUOLI } = require('./middleware/auth');

const router = express.Router();
const { SEGNALATORE, OPERATORE, SQUADRA, RESPONSABILE, ADMIN } = RUOLI;

// Stati che ogni ruolo puo impostare con PATCH /:id/stato (matrice dei permessi)
const STATI_PER_RUOLO = {
  [OPERATORE]: ['valutata', 'assegnata', 'chiusa'],
  [SQUADRA]: ['in_intervento', 'risolta'],
  [ADMIN]: ['ricevuta', 'valutata', 'assegnata', 'in_intervento', 'risolta', 'chiusa']
};

// Condizione SQL per vedere solo le segnalazioni permesse al ruolo:
// - segnalatore: solo quelle che ha creato lui
// - squadra: solo quelle assegnate a una delle sue squadre
// - operatore, responsabile, amministratore: tutte
function filtroVisibilita(utente, primoParametro) {
  const p = `$${primoParametro}`;
  if (utente.ruolo === SEGNALATORE) {
    return { sql: `s.id_utente = ${p}`, valori: [utente.id] };
  }
  if (utente.ruolo === SQUADRA) {
    return {
      sql: `s.id IN (SELECT a.id_segnalazione
                       FROM assegnazione a
                       JOIN squadra_utente su ON su.id_squadra = a.id_squadra
                      WHERE su.id_utente = ${p})`,
      valori: [utente.id]
    };
  }
  return { sql: 'TRUE', valori: [] };
}

const STATI_VALIDI = ['ricevuta', 'valutata', 'assegnata', 'in_intervento', 'risolta', 'chiusa'];
const MACCHINA_STATI = {
  ricevuta: ['valutata'],
  valutata: ['assegnata'],
  assegnata: ['in_intervento'],
  in_intervento: ['risolta'],
  risolta: ['chiusa'],
  chiusa: []
};

router.get('/stati', (req, res) => {
  res.json({
    stati: STATI_VALIDI,
    transizioni: MACCHINA_STATI,
    descrizione: 'Sequenza consentita: ricevuta -> valutata -> assegnata -> in_intervento -> risolta -> chiusa'
  });
});

// Tutte le rotte qui sotto richiedono il login (token JWT valido)
router.use(autentica);

// Gestione degli errori del database
function gestisciErrore(err, res) {
  console.error('Errore:', err.message);
  if (err.code === '23514') return res.status(400).json({ errore: 'Valore non valido (stato, priorita o canale)' });
  if (err.code === '23503') return res.status(400).json({ errore: 'Utente, area o categoria inesistente' });
  if (err.code === '23502') return res.status(400).json({ errore: 'Campo obbligatorio mancante' });
  if (err.code === '22P02') return res.status(400).json({ errore: 'Formato dei dati non valido' });
  res.status(500).json({ errore: 'Errore interno del server' });
}

function validaTransizione(statoCorrente, nuovoStato) {
  const transizioniConsentite = MACCHINA_STATI[statoCorrente] || [];
  if (!transizioniConsentite.includes(nuovoStato)) {
    throw new Error(
      `Transizione non valida: ${statoCorrente} -> ${nuovoStato}. ` +
      `Stati consentiti: ${transizioniConsentite.join(', ') || 'nessuno'}`
    );
  }
}

// CREATE - crea una nuova segnalazione
router.post('/', autorizza(SEGNALATORE, OPERATORE, ADMIN), async (req, res) => {
  const { titolo, descrizione, indirizzo, latitudine, longitudine,
          priorita, canale, id_area, id_categoria } = req.body;
  // L'autore e sempre l'utente del token, non quello scritto nel body
  const id_utente = req.utente.id;

  if (!titolo || !id_area) {
    return res.status(400).json({ errore: 'titolo e id_area sono obbligatori' });
  }

  try {
    const risultato = await pool.query(
      `INSERT INTO segnalazione
         (titolo, descrizione, indirizzo, latitudine, longitudine,
          priorita, canale, id_utente, id_area, id_categoria)
       VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'media'), $7, $8, $9, $10)
       RETURNING *`,
      [titolo, descrizione, indirizzo, latitudine, longitudine,
       priorita, canale, id_utente, id_area, id_categoria]
    );
    res.status(201).json(risultato.rows[0]);
  } catch (err) {
    gestisciErrore(err, res);
  }
});

// READ - tutte le segnalazioni
router.get('/', async (req, res) => {
  try {
    const filtro = filtroVisibilita(req.utente, 1);
    const risultato = await pool.query(
      `SELECT s.* FROM segnalazione s WHERE ${filtro.sql} ORDER BY s.id`,
      filtro.valori
    );
    res.json(risultato.rows);
  } catch (err) {
    gestisciErrore(err, res);
  }
});

// READ - una segnalazione
router.get('/:id', async (req, res) => {
  try {
    const risultato = await pool.query('SELECT * FROM segnalazione WHERE id = $1', [req.params.id]);
    if (risultato.rows.length === 0) {
      return res.status(404).json({ errore: 'Segnalazione non trovata' });
    }
    const filtro = filtroVisibilita(req.utente, 2);
    const visibile = await pool.query(
      `SELECT 1 FROM segnalazione s WHERE s.id = $1 AND ${filtro.sql}`,
      [req.params.id, ...filtro.valori]
    );
    if (visibile.rows.length === 0) {
      return res.status(403).json({ errore: 'Non hai i permessi per vedere questa segnalazione' });
    }
    res.json(risultato.rows[0]);
  } catch (err) {
    gestisciErrore(err, res);
  }
});

// UPDATE - cambia lo stato secondo la macchina a stati consentita E salva lo storico
router.patch('/:id/stato', autorizza(OPERATORE, SQUADRA, ADMIN), async (req, res) => {
  const { stato } = req.body;

  if (!stato || typeof stato !== 'string') {
    return res.status(400).json({ errore: 'stato obbligatorio' });
  }

  const nuovoStato = stato.trim();

  if (!STATI_VALIDI.includes(nuovoStato)) {
    return res.status(400).json({ errore: `stato non valido: ${nuovoStato}` });
  }

  // Ogni ruolo puo portare la segnalazione solo in certi stati
  if (!STATI_PER_RUOLO[req.utente.ruolo].includes(nuovoStato)) {
    return res.status(403).json({
      errore: `Il ruolo "${req.utente.ruolo}" non puo impostare lo stato "${nuovoStato}"`
    });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const segnalazione = await client.query(
      'SELECT id, stato, id_utente FROM segnalazione WHERE id = $1 FOR UPDATE',
      [req.params.id]
    );

    if (segnalazione.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ errore: 'Segnalazione non trovata' });
    }

    const statoCorrente = segnalazione.rows[0].stato;
    // Nello storico finisce l'utente che ha fatto la modifica (dal token)
    const idUtenteStorico = req.utente.id;

    // La squadra puo aggiornare solo le segnalazioni assegnate a lei
    if (req.utente.ruolo === SQUADRA) {
      const assegnata = await client.query(
        `SELECT 1 FROM assegnazione a
           JOIN squadra_utente su ON su.id_squadra = a.id_squadra
          WHERE a.id_segnalazione = $1 AND su.id_utente = $2`,
        [req.params.id, req.utente.id]
      );
      if (assegnata.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(403).json({ errore: 'Questa segnalazione non e assegnata alla tua squadra' });
      }
    }

    try {
      validaTransizione(statoCorrente, nuovoStato);
    } catch (err) {
      await client.query('ROLLBACK');
      return res.status(400).json({ errore: err.message });
    }

// Aggiorna stato
const risultato = await client.query(
  `UPDATE segnalazione
      SET stato = $1::varchar,
          chiusa_il = CASE
            WHEN $1::varchar = 'chiusa' THEN COALESCE(chiusa_il, now())
            ELSE NULL
          END
    WHERE id = $2
    RETURNING *`,
  [nuovoStato, req.params.id]
);

    // Registra nello storico_modifica
    await client.query(
      `INSERT INTO storico_modifica (tipo_evento, campo, valore_precedente, valore_nuovo, id_segnalazione, id_utente)
       VALUES ('cambio_stato', 'stato', $1, $2, $3, $4)`,
      [statoCorrente, nuovoStato, req.params.id, idUtenteStorico]
    );

    await client.query('COMMIT');
    res.json(risultato.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    gestisciErrore(err, res);
  } finally {
    client.release();
  }
});

// NOTE - Aggiungi nota a una segnalazione
router.post('/:id/note', autorizza(SEGNALATORE, OPERATORE, SQUADRA, RESPONSABILE, ADMIN), async (req, res) => {
  const { testo } = req.body;
  const id_utente = req.utente.id; // autore della nota = utente del token
  const id_segnalazione = req.params.id;

  if (!testo) {
    return res.status(400).json({ errore: 'Il testo della nota è obbligatorio' });
  }

  try {
    // Verifica esistenza segnalazione
    const chk = await pool.query('SELECT id FROM segnalazione WHERE id = $1', [id_segnalazione]);
    if (chk.rows.length === 0) {
      return res.status(404).json({ errore: 'Segnalazione non trovata' });
    }

    const risultato = await pool.query(
      `INSERT INTO nota (id_segnalazione, id_utente, testo)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id_segnalazione, id_utente, testo]
    );

    res.status(201).json(risultato.rows[0]);
  } catch (err) {
    gestisciErrore(err, res);
  }
});

// NOTE - Leggi note di una segnalazione
router.get('/:id/note', async (req, res) => {
  try {
    const risultato = await pool.query(
      `SELECT n.*, u.nome_cognome, n.creata_il AS data_ora
       FROM nota n
       LEFT JOIN utente u ON n.id_utente = u.id
       WHERE n.id_segnalazione = $1
       ORDER BY n.creata_il ASC`,
      [req.params.id]
    );
    res.json(risultato.rows);
  } catch (err) {
    gestisciErrore(err, res);
  }
});

// ASSEGNAZIONE - Assegna segnalazione a utente o squadra
router.post('/:id/assegna', autorizza(OPERATORE, ADMIN), async (req, res) => {
  const { id_squadra } = req.body;
  const id_segnalazione = req.params.id;

  if (!id_squadra) {
    return res.status(400).json({ errore: 'Specificare id_squadra' });
  }

  try {
    const chk = await pool.query('SELECT id, id_utente FROM segnalazione WHERE id = $1', [id_segnalazione]);
    if (chk.rows.length === 0) {
      return res.status(404).json({ errore: 'Segnalazione non trovata' });
    }

    // Chi assegna e l'utente del token (operatore di centrale o amministratore)
    const idUtenteAssegnazione = req.utente.id;

    const risultato = await pool.query(
      `INSERT INTO assegnazione (id_segnalazione, id_squadra, id_utente)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id_segnalazione, id_squadra, idUtenteAssegnazione]
    );

    res.status(201).json(risultato.rows[0]);
  } catch (err) {
    gestisciErrore(err, res);
  }
});

// STORICO - Leggi lo storico delle modifiche di una segnalazione
router.get('/:id/storico', async (req, res) => {
  try {
    const risultato = await pool.query(
      `SELECT s.*, u.nome_cognome, s."timestamp" AS data_ora
       FROM storico_modifica s
       LEFT JOIN utente u ON s.id_utente = u.id
       WHERE s.id_segnalazione = $1
       ORDER BY s."timestamp" DESC`,
      [req.params.id]
    );
    res.json(risultato.rows);
  } catch (err) {
    gestisciErrore(err, res);
  }
});

/**
 * POST /segnalazioni/:id/note
 * Inserisce una nuova nota associata a una segnalazione.
 */
router.post('/:id/note', async (req, res) => {
    const { id } = req.params;
    const { id_utente, testo } = req.body;

    try {
        // 1. Validazione dei campi obbligatori
        if (
            id_utente === undefined ||
            id_utente === null ||
            testo === undefined ||
            testo === null ||
            String(testo).trim() === ''
        ) {
            return res.status(400).json({
                error: 'I campi id_utente e testo sono obbligatori.'
            });
        }

        // 2. Verifica esistenza della segnalazione
        const segnalazione = await pool.query(
            'SELECT id FROM segnalazione WHERE id = $1',
            [id]
        );

        if (segnalazione.rowCount === 0) {
            return res.status(404).json({
                error: 'Segnalazione non trovata.'
            });
        }

        // 3. Inserimento della nota
        const result = await pool.query(
            `INSERT INTO nota (
                id_segnalazione,
                id_utente,
                testo
            )
            VALUES ($1, $2, $3)
            RETURNING *`,
            [id, id_utente, testo.trim()]
        );

        // 4. Risposta
        return res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Errore durante l\'inserimento della nota:', error);

        return res.status(500).json({
            error: 'Errore interno durante l\'inserimento della nota.'
        });
    }
});


/**
 * GET /segnalazioni/:id/note
 * Recupera tutte le note associate a una segnalazione.
 */
router.get('/:id/note', async (req, res) => {
    const { id } = req.params;

    try {
        // JOIN tra nota e utente usando la colonna u.nome_cognome
        const result = await pool.query(
            `SELECT
                n.id,
                n.testo,
                n.data_creazione,
                n.id_utente,
                u.nome_cognome AS autore
            FROM nota n
            INNER JOIN utente u
                ON n.id_utente = u.id
            WHERE n.id_segnalazione = $1
            ORDER BY n.data_creazione DESC`,
            [id]
        );

        return res.status(200).json(result.rows);

    } catch (error) {
        console.error('Errore durante il recupero delle note:', error);

        return res.status(500).json({
            error: 'Errore interno durante il recupero delle note.'
        });
    }
});

/**
 * POST /segnalazioni/:id/note
 * Inserisce una nuova nota associata a una segnalazione.
 */
router.post('/:id/note', async (req, res) => {
    const { id } = req.params;
    const { id_utente, testo } = req.body;

    try {
        // 1. Validazione dei campi obbligatori
        if (
            id_utente === undefined ||
            id_utente === null ||
            testo === undefined ||
            testo === null ||
            String(testo).trim() === ''
        ) {
            return res.status(400).json({
                error: 'I campi id_utente e testo sono obbligatori.'
            });
        }

        // 2. Verifica esistenza della segnalazione
        const segnalazione = await pool.query(
            'SELECT id FROM segnalazione WHERE id = $1',
            [id]
        );

        if (segnalazione.rowCount === 0) {
            return res.status(404).json({
                error: 'Segnalazione non trovata.'
            });
        }

        // 3. Inserimento della nota
        const result = await pool.query(
            `INSERT INTO nota (
                id_segnalazione,
                id_utente,
                testo
            )
            VALUES ($1, $2, $3)
            RETURNING *`,
            [id, id_utente, testo.trim()]
        );

        // 4. Risposta
        return res.status(201).json(result.rows[0]);

    } catch (error) {
        console.error('Errore durante l\'inserimento della nota:', error);

        return res.status(500).json({
            error: 'Errore interno durante l\'inserimento della nota.'
        });
    }
});


/**
 * GET /segnalazioni/:id/note
 * Recupera tutte le note associate a una segnalazione.
 */
router.get('/:id/note', async (req, res) => {
    const { id } = req.params;

    try {
        // JOIN tra nota e utente usando la colonna u.nome_cognome
        const result = await pool.query(
            `SELECT
                n.id,
                n.testo,
                n.data_creazione,
                n.id_utente,
                u.nome_cognome AS autore
            FROM nota n
            INNER JOIN utente u
                ON n.id_utente = u.id
            WHERE n.id_segnalazione = $1
            ORDER BY n.data_creazione DESC`,
            [id]
        );

        return res.status(200).json(result.rows);

    } catch (error) {
        console.error('Errore durante il recupero delle note:', error);

        return res.status(500).json({
            error: 'Errore interno durante il recupero delle note.'
        });
    }
});
module.exports = router;