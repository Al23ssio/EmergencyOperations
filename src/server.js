const express = require('express');
const pool = require('./db');

const REQUIRED_ENV = ['DB_HOST', 'POSTGRES_DB', 'POSTGRES_USER', 'POSTGRES_PASSWORD'];

const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);

if (missingEnv.length > 0) {
  console.error(`\x1b[31m[ERRORE CRITICO] Configurazione mancante: ${missingEnv.join(', ')}\x1b[0m`);
  console.error('L\'applicazione non può avviarsi senza queste variabili d\'ambiente.');
  process.exit(1);
}

const app = express();
app.use(express.json());

const allowedOrigin = process.env.CORS_ORIGIN || '*';
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', allowedOrigin);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }
  next();
});

app.use('/segnalazioni', require('./segnalazioni'));
app.use(express.static('public'));

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      server: 'ok',
      database: 'ok',
      environment: process.env.NODE_ENV || 'development',
      corsOrigin: allowedOrigin
    });
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