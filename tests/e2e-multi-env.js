const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

async function runE2E() {
  console.log(`=== Avvio Test End-to-End su ${BASE_URL} ===`);

  const frontendRes = await fetch(`${BASE_URL}/`);
  if (!frontendRes.ok) throw new Error(`Frontend non raggiungibile: ${frontendRes.status}`);
  console.log('[OK] 1. Frontend statico servito correttamente (HTTP 200)');

  const healthRes = await fetch(`${BASE_URL}/health`);
  const healthData = await healthRes.json();
  if (!healthRes.ok || healthData.database !== 'ok') {
    throw new Error(`Healthcheck fallito: ${JSON.stringify(healthData)}`);
  }
  console.log(`[OK] 2. Backend -> Database connesso (env: ${healthData.environment}, CORS: ${healthData.corsOrigin})`);

  // Inseriamo titolo, id_utente e id_area come richiesto dal validatore del backend
  const createRes = await fetch(`${BASE_URL}/segnalazioni`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      titolo: 'Test E2E Multi-Ambiente',
      descrizione: 'Verifica flusso Frontend -> Backend -> Database',
      priorita: 'alta',
      luogo: 'Via Roma 1, Milano',
      id_utente: 1,
      id_area: 1
    })
  });
  
  if (createRes.status !== 201) {
    const errBody = await createRes.text();
    throw new Error(`Creazione segnalazione fallita (HTTP ${createRes.status}): ${errBody}`);
  }
  
  const creata = await createRes.json();
  console.log(`[OK] 3. Creazione segnalazione su DB riuscita (ID: ${creata.id})`);

  const listRes = await fetch(`${BASE_URL}/segnalazioni`);
  const lista = await listRes.json();
  if (!listRes.ok || !Array.isArray(lista)) {
    throw new Error('Lettura lista segnalazioni fallita');
  }
  console.log(`[OK] 4. Lettura segnalazioni da DB riuscita (Totale record: ${lista.length})`);

  const patchRes = await fetch(`${BASE_URL}/segnalazioni/${creata.id}/stato`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stato: 'valutata' })
  });
  
  if (!patchRes.ok) {
    const errPatch = await patchRes.text();
    throw new Error(`Aggiornamento stato fallito (HTTP ${patchRes.status}): ${errPatch}`);
  }
  
  console.log(`[OK] 5. Aggiornamento stato segnalazione ID ${creata.id} completato`);
  console.log('=== TUTTI I TEST END-TO-END SONO PASSATI CON SUCCESSO ===');
}

runE2E().catch((err) => {
  console.error('[ERRORE E2E]', err.message);
  process.exit(1);
});