const express = require('express');
const pool = require('./db');
const { listaInterventi } = require('./interventi/listra');

const app = express();
app.use(express.json());
app.use('/segnalazioni', require('./segnalazioni'));

// Nuovo endpoint per ottenere la lista degli interventi filtrati per tecnico
app.get('/interventi', (req, res) => {
  const { tecnicoId } = req.query;
  res.json(listaInterventi(tecnicoId));
});

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
    app.listen(PORT, () => console.log('Server avviato su http://localhost:' + PORT));
  } catch (err) {
    console.error('Impossibile connettersi al database:', err.message);
    process.exit(1);
  }
}

avvia();