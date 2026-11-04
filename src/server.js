const express = require('express');
const pool = require('./db');

// --- PASSO 1: CONTROLLO E VALIDAZIONE VARIABILI D'AMBIENTE ---
const REQUIRED_ENV = ['DB_HOST', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'];

const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`\x1b[31m[ERRORE CRITICO] Configurazione mancante: ${missingEnv.join(', ')}\x1b[0m`);
  console.error('L\'applicazione non può avviarsi senza queste variabili d\'ambiente.');
  process.exit(1); // Arresto immediato prima di caricare Express o il DB
}

const app = express();
app.use(express.json());
app.use('/segnalazioni', require('./segnalazioni'));
app.use(express.static('public'));

// Controllo di salute: dice se il server e il database funzionano
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ server: 'ok', database: 'ok' });
  } catch (err) {
    console.error('Errore database:', err.message);
    res.status(500).json({ server: 'ok', database: 'non raggiungibile' });
  }
});

const PORT = process.env.PORT || 3000;

async function avvia() {
  try {
    await pool.query('SELECT 1');
    console.log('Database connesso');
    app.listen(PORT, () => console.log('Server avviato sulla porta ' + PORT));
  } catch (err) {
    console.error('Impossibile connettersi al database:', err.message);
    process.exit(1);
  }
}

avvia();