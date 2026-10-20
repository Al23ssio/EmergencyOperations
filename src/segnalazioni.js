// Operazioni sulle segnalazioni: crea, leggi, aggiorna
const express = require('express');
const pool = require('./db');

const router = express.Router();

const STATI_VALIDI = ['ricevuta', 'valutata', 'assegnata', 'in_intervento', 'risolta', 'chiusa'];
const MACCHINA_STATI = {
  ricevuta: ['valutata'],
  valutata: ['assegnata'],
  assegnata: ['in_intervento'],
  in_intervento: ['risolta'],
  risolta: ['chiusa'],
  chiusa: []
};

// Gestione degli errori del database
function gestisciErrore(err, res) {
  console.error('Errore:', err.message);
  if (err.code === '23514') return res.status(400).json({ errore: 'Valore non valido (stato, priorita o canale)' });
  if (err.code === '23503') return res.status(400).json({ errore: 'Utente, area o categoria inesistente' });
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
router.post('/', async (req, res) => {
  const { titolo, descrizione, indirizzo, latitudine, longitudine,
          priorita, canale, id_utente, id_area, id_categoria } = req.body;

  // TODO: sostituire con l'utente autenticato quando sarà disponibile il sistema di login.
  // Per ora id_utente arriva dal body e non è affidabile come identificativo reale dell'utente.
  if (!titolo || !id_utente || !id_area) {
    return res.status(400).json({ errore: 'titolo, id_utente e id_area sono obbligatori' });
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
    const risultato = await pool.query('SELECT * FROM segnalazione ORDER BY id');
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
    res.json(risultato.rows[0]);
  } catch (err) {
    gestisciErrore(err, res);
  }
});

// UPDATE - cambia lo stato secondo la macchina a stati consentita
router.patch('/:id/stato', async (req, res) => {
  const { stato } = req.body;

  if (!stato || typeof stato !== 'string') {
    return res.status(400).json({ errore: 'stato obbligatorio' });
  }

  const nuovoStato = stato.trim();

  if (!STATI_VALIDI.includes(nuovoStato)) {
    return res.status(400).json({ errore: `stato non valido: ${nuovoStato}` });
  }

  try {
    const segnalazione = await pool.query(
      'SELECT id, stato FROM segnalazione WHERE id = $1',
      [req.params.id]
    );

    if (segnalazione.rows.length === 0) {
      return res.status(404).json({ errore: 'Segnalazione non trovata' });
    }

    const statoCorrente = segnalazione.rows[0].stato;

    try {
      validaTransizione(statoCorrente, nuovoStato);
    } catch (err) {
      return res.status(400).json({ errore: err.message });
    }

    const risultato = await pool.query(
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

    res.json(risultato.rows[0]);
  } catch (err) {
    gestisciErrore(err, res);
  }
});

module.exports = router;