// Login reale: controlla le credenziali sul database e restituisce un token JWT
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');
const { autentica } = require('./middleware/auth');

const router = express.Router();

// Hash "finto" usato quando l'utente non esiste: cosi la risposta impiega
// lo stesso tempo e non si capisce dall'esterno quali username esistono.
const HASH_FITTIZIO = '$2b$10$0NKT8ICtPaWeqcBdGUINTuWuYVIUi2HI469UBnS2LnSc8kKOmzRYu';

// POST /api/auth/login  { "username": "...", "password": "..." }
// Si puo fare il login con lo username oppure con l'email.
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username e password sono obbligatori' });
  }

  try {
    const risultato = await pool.query(
      `SELECT u.id, u.username, u.email, u.nome_cognome, u.password_hash, u.attivo, r.nome AS ruolo
         FROM utente u
         JOIN ruolo r ON r.id = u.id_ruolo
        WHERE u.username = $1 OR u.email = $1`,
      [username]
    );
    const utente = risultato.rows[0];

    // Il confronto bcrypt si fa sempre, anche se l'utente non esiste
    const passwordOk = await bcrypt.compare(password, utente ? utente.password_hash : HASH_FITTIZIO);

    // Utente inesistente, disattivato o password sbagliata: stesso messaggio
    // generico, cosi non diamo indizi a chi prova a indovinare le credenziali.
    if (!utente || !utente.attivo || !passwordOk) {
      return res.status(401).json({ success: false, message: 'Credenziali non valide' });
    }

    // Nel token mettiamo solo i dati essenziali (mai la password o l'hash)
    const token = jwt.sign(
      { id: utente.id, email: utente.email, ruolo: utente.ruolo },
      process.env.JWT_SECRET,
      { algorithm: 'HS256', expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return res.status(200).json({
      success: true,
      message: 'Login effettuato con successo',
      token,
      user: {
        id: utente.id,
        username: utente.username,
        email: utente.email,
        nome_cognome: utente.nome_cognome,
        role: utente.ruolo
      }
    });
  } catch (err) {
    console.error('Errore durante il login:', err.message);
    return res.status(500).json({ success: false, message: 'Errore interno del server' });
  }
});

// GET /api/auth/me -> dati dell'utente collegato (utile per provare il token)
router.get('/me', autentica, (req, res) => {
  res.json(req.utente);
});

module.exports = router;
