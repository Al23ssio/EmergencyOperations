// Operazioni sulle segnalazioni: crea, leggi, aggiorna
const express = require('express');
const pool = require('./db');

const router = express.Router();

// Gestione degli errori del database
function gestisciErrore(err, res) {
  console.error('Errore:', err.message);
  if (err.code === '23514') return res.status(400).json({ errore: 'Valore non valido (stato, priorita o canale)' });
  if (err.code === '23503') return res.status(400).json({ errore: 'Utente, area o categoria inesistente' });
  if (err.code === '22P02') return res.status(400).json({ errore: 'Formato dei dati non valido' });
  res.status(500).json({ errore: 'Errore interno del server' });
}

// CREATE - crea una nuova segnalazione
router.post('/', async (req, res) => {
  const { titolo, descrizione, indirizzo, latitudine, longitudine,
          priorita, canale, id_utente, id_area, id_categoria } = req.body;

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

// UPDATE - cambia lo stato
router.patch('/:id/stato', async (req, res) => {
  const { stato } = req.body;
  if (!stato) return res.status(400).json({ errore: 'stato obbligatorio' });

  try {
    const risultato = await pool.query(
      `UPDATE segnalazione
         SET stato = $1::varchar,
             chiusa_il = CASE WHEN $1::varchar = 'chiusa' THEN now() ELSE NULL END
       WHERE id = $2
       RETURNING *`,
      [stato, req.params.id]
    );
    if (risultato.rows.length === 0) {
      return res.status(404).json({ errore: 'Segnalazione non trovata' });
    }
    res.json(risultato.rows[0]);
  } catch (err) {
    gestisciErrore(err, res);
  }
});

module.exports = router;