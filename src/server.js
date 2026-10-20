const express = require('express');
const pool = require('./db');
const { listaInterventi, aggiornaStatoIntervento } = require('./interventi/listra');

const app = express();
app.use(express.json());
app.use('/segnalazioni', require('./segnalazioni'));

// Nuovo endpoint per ottenere la lista degli interventi filtrati per tecnico
app.get('/interventi', (req, res) => {
  const { tecnicoId, stato } = req.query;
  res.json(listaInterventi(tecnicoId, stato));
});

app.patch('/interventi/:id', (req, res) => {
  const { id } = req.params;
  const { stato } = req.body;

  if (!stato) {
    return res.status(400).json({ errore: 'stato obbligatorio' });
  }

  const risultato = aggiornaStatoIntervento(id, stato);
  if (risultato.code !== 200) {
    return res.status(risultato.code).json({ errore: risultato.errore });
  }

  res.json(risultato.intervento);
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