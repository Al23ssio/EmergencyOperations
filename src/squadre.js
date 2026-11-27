// Elenco squadre con i loro componenti: serve all'operatore per scegliere
// a chi assegnare una segnalazione (a tutta la squadra o a una persona)
const express = require('express');
const pool = require('./db');
const { autentica, autorizza, RUOLI } = require('./middleware/auth');

const router = express.Router();

router.use(autentica, autorizza(RUOLI.OPERATORE, RUOLI.RESPONSABILE, RUOLI.ADMIN));

// GET /squadre -> [{ id, nome, membri: [{ id, username, nome_cognome }] }]
router.get('/', async (req, res) => {
  try {
    const risultato = await pool.query(
      `SELECT sq.id, sq.nome,
              COALESCE(
                json_agg(json_build_object('id', u.id, 'username', u.username, 'nome_cognome', u.nome_cognome)
                         ORDER BY u.nome_cognome)
                  FILTER (WHERE u.id IS NOT NULL),
                '[]'
              ) AS membri
         FROM squadra sq
         LEFT JOIN squadra_utente su ON su.id_squadra = sq.id
         LEFT JOIN utente u ON u.id = su.id_utente AND u.attivo
        WHERE sq.attiva
        GROUP BY sq.id, sq.nome
        ORDER BY sq.nome`
    );
    res.json(risultato.rows);
  } catch (err) {
    console.error('Errore lettura squadre:', err.message);
    res.status(500).json({ errore: 'Errore interno del server' });
  }
});

module.exports = router;
