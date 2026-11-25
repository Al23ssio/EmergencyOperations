// Gestione utenti: solo l'amministratore puo vederli e crearli
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('./db');
const { autentica, autorizza, RUOLI } = require('./middleware/auth');

const router = express.Router();

// Tutte le rotte di questo file: token valido + ruolo amministratore
router.use(autentica, autorizza(RUOLI.ADMIN));

// GET /utenti -> elenco utenti (senza password_hash!)
router.get('/', async (req, res) => {
  try {
    const risultato = await pool.query(
      `SELECT u.id, u.username, u.email, u.nome_cognome, u.attivo,
              r.nome AS ruolo, u.created_at, u.updated_at
         FROM utente u
         JOIN ruolo r ON r.id = u.id_ruolo
        ORDER BY u.id`
    );
    res.json(risultato.rows);
  } catch (err) {
    console.error('Errore lettura utenti:', err.message);
    res.status(500).json({ errore: 'Errore interno del server' });
  }
});

// POST /utenti { username, email, password, nome_cognome, ruolo }
router.post('/', async (req, res) => {
  const { username, email, password, nome_cognome, ruolo } = req.body || {};

  if (!username || !email || !password || !ruolo) {
    return res.status(400).json({ errore: 'username, email, password e ruolo sono obbligatori' });
  }
  if (String(password).length < 8) {
    return res.status(400).json({ errore: 'La password deve avere almeno 8 caratteri' });
  }
  if (!Object.values(RUOLI).includes(ruolo)) {
    return res.status(400).json({ errore: `Ruolo non valido. Ruoli ammessi: ${Object.values(RUOLI).join(', ')}` });
  }

  try {
    // La password viene trasformata in hash prima di arrivare al database
    const passwordHash = await bcrypt.hash(String(password), 10);

    const risultato = await pool.query(
      `INSERT INTO utente (username, email, password_hash, nome_cognome, id_ruolo)
       VALUES ($1, $2, $3, $4, (SELECT id FROM ruolo WHERE nome = $5))
       RETURNING id, username, email, nome_cognome, attivo, created_at, updated_at`,
      [username, email, passwordHash, nome_cognome || null, ruolo]
    );

    res.status(201).json({ ...risultato.rows[0], ruolo });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ errore: 'Username o email gia registrati' });
    }
    console.error('Errore creazione utente:', err.message);
    res.status(500).json({ errore: 'Errore interno del server' });
  }
});

module.exports = router;
