const test = require('node:test');
const assert = require('node:assert');

// Configurazione URL base, supporta l'ambiente locale e la CI
const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

test('Integration Test: PATCH /segnalazioni/:id/stato (Database Reale)', async (t) => {
  
  let idSegnalazioneTest;

  // Setup: Creazione di una segnalazione iniziale sul DB (Stato di default: 'ricevuta')
  await t.test('Setup: Creazione segnalazione di test', async () => {
    const resCreate = await fetch(`${BASE_URL}/segnalazioni`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titolo: 'Test Integrazione Macchina Stati',
        descrizione: 'Segnalazione creata per testare la transizione di stato sul DB reale',
        id_utente: 1,
        id_area: 1
      })
    });

    assert.ok(resCreate.status === 201 || resCreate.status === 200, 'Creazione fallita sul DB');
    const creata = await resCreate.json();
    assert.ok(creata.id, 'ID non restituito dal DB');
    assert.strictEqual(creata.stato, 'ricevuta', 'Lo stato iniziale deve essere ricevuta');
    
    idSegnalazioneTest = creata.id;
  });

  // Test 1: Transizione non ammessa
  await t.test('Errore: Transizione non ammessa (ricevuta -> chiusa)', async () => {
    const resInvalid = await fetch(`${BASE_URL}/segnalazioni/${idSegnalazioneTest}/stato`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'chiusa' })
    });
    
    assert.strictEqual(resInvalid.status, 400, 'Il server non ha bloccato la transizione errata');
    const bodyError = await resInvalid.json();
    assert.ok(bodyError.errore.includes('Transizione non valida'), 'Messaggio di errore inatteso');
  });

  // Test 2: Transizione corretta (Happy Path)
  await t.test('Successo: Transizione ammessa (ricevuta -> valutata)', async () => {
    const resValid = await fetch(`${BASE_URL}/segnalazioni/${idSegnalazioneTest}/stato`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'valutata', id_utente: 1 })
    });
    
    assert.strictEqual(resValid.status, 200, 'Aggiornamento sul DB fallito');
    const bodyValid = await resValid.json();
    assert.strictEqual(bodyValid.stato, 'valutata', 'Lo stato non è stato aggiornato correttamente');
  });

  // Test 3: Gestione ID inesistente
  await t.test('Errore: Segnalazione inesistente (404)', async () => {
    const resNotFound = await fetch(`${BASE_URL}/segnalazioni/999999/stato`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'valutata' })
    });
    
    assert.strictEqual(resNotFound.status, 404, 'Status code errato per ID inesistente sul DB');
  });

  // Test 4: Body non valido
  await t.test('Errore: Stato obbligatorio mancante', async () => {
    const resBadRequest = await fetch(`${BASE_URL}/segnalazioni/${idSegnalazioneTest}/stato`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}) // Body vuoto
    });
    
    assert.strictEqual(resBadRequest.status, 400, 'Il server non ha bloccato la richiesta senza stato');
    const bodyError = await resBadRequest.json();
    assert.strictEqual(bodyError.errore, 'stato obbligatorio');
  });
});