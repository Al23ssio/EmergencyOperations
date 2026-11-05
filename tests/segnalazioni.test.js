const test = require('node:test');
const assert = require('node:assert');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

// 1. GET /health - Happy Path
test('GET /health - Happy Path: Server e DB attivi', async () => {
  const res = await fetch(`${BASE_URL}/health`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.strictEqual(body.server, 'ok');
  assert.strictEqual(body.database, 'ok');
});

// 2. GET /segnalazioni/stati - Happy Path
test('GET /segnalazioni/stati - Happy Path: Lista stati e transizioni', async () => {
  const res = await fetch(`${BASE_URL}/segnalazioni/stati`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.stati));
  assert.ok(body.transizioni);
  assert.ok(body.stati.includes('ricevuta'));
});

// 3. GET /segnalazioni - Happy Path
test('GET /segnalazioni - Happy Path: Lista segnalazioni', async () => {
  const res = await fetch(`${BASE_URL}/segnalazioni`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
});

// 4. POST /segnalazioni - Happy Path
test('POST /segnalazioni - Happy Path: Creazione valida', async () => {
  const nuovaSegnalazione = {
    titolo: 'Test perdita d acqua',
    descrizione: 'Perdita riscontrata in via Test 12',
    id_utente: 1,
    id_area: 1
  };

  const res = await fetch(`${BASE_URL}/segnalazioni`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(nuovaSegnalazione)
  });

  assert.ok(res.status === 201 || res.status === 200);
  const body = await res.json();
  assert.ok(body.id);
  assert.strictEqual(body.titolo, nuovaSegnalazione.titolo);
  assert.strictEqual(body.stato, 'ricevuta');
});

// 5. POST /segnalazioni - Caso Errore
test('POST /segnalazioni - Caso Errore: Body vuoto o non valido', async () => {
  const res = await fetch(`${BASE_URL}/segnalazioni`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.strictEqual(res.status, 400);
  const body = await res.json();
  assert.ok(body.errore || body.message || body.error);
});

// 6. GET /segnalazioni/:id - Happy Path & Caso 404
test('GET /segnalazioni/:id - Happy Path & 404 per ID inesistente', async () => {
  // Caso Errore: ID inesistente
  const resNotFound = await fetch(`${BASE_URL}/segnalazioni/999999`);
  assert.strictEqual(resNotFound.status, 404);

  // Happy Path: Recupera una segnalazione esistente
  const resList = await fetch(`${BASE_URL}/segnalazioni`);
  const lista = await resList.json();

  if (lista.length > 0) {
    const idValido = lista[0].id;
    const resOk = await fetch(`${BASE_URL}/segnalazioni/${idValido}`);
    assert.strictEqual(resOk.status, 200);
    const body = await resOk.json();
    assert.strictEqual(body.id, idValido);
  }
});

// 7. PATCH /segnalazioni/:id/stato - Transizioni ammesse, non ammesse e ID 404
test('PATCH /segnalazioni/:id/stato - Gestione transizioni di stato', async () => {
  // Caso Errore: ID inesistente
  const resNotFound = await fetch(`${BASE_URL}/segnalazioni/999999/stato`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stato: 'valutata' })
  });
  assert.strictEqual(resNotFound.status, 404);

  // Creazione di una nuova segnalazione di prova per testare lo stato
  const resCreate = await fetch(`${BASE_URL}/segnalazioni`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ titolo: 'Test Stato', id_utente: 1, id_area: 1 })
  });

  if (resCreate.status === 201 || resCreate.status === 200) {
    const creata = await resCreate.json();

    // Caso Errore: Transizione non ammessa ('ricevuta' -> 'chiusa')
    const resInvalid = await fetch(`${BASE_URL}/segnalazioni/${creata.id}/stato`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'chiusa' })
    });
    assert.strictEqual(resInvalid.status, 400);

    // Happy Path: Transizione ammessa ('ricevuta' -> 'valutata')
    const resValid = await fetch(`${BASE_URL}/segnalazioni/${creata.id}/stato`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: 'valutata' })
    });
    assert.strictEqual(resValid.status, 200);
    const bodyValid = await resValid.json();
    assert.strictEqual(bodyValid.stato, 'valutata');
  }
});

// 8. POST /segnalazioni - Creazione corretta con payload completo
test('POST /segnalazioni - Creazione corretta: payload valido', async () => {
  const payload = {
    titolo: 'Guasto illuminazione via Test',
    descrizione: 'Lampione spento in via Test 22',
    indirizzo: 'Via Test 22',
    latitudine: 45.123456,
    longitudine: 9.654321,
    priorita: 'alta',
    canale: 'web',
    id_utente: 1,
    id_area: 2,
    id_categoria: 1
  };

  const res = await fetch(`${BASE_URL}/segnalazioni`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  assert.strictEqual(res.status, 201);
  const body = await res.json();
  assert.ok(body.id);
  assert.strictEqual(body.titolo, payload.titolo);
  assert.strictEqual(body.stato, 'ricevuta');
  assert.strictEqual(body.id_area, payload.id_area);
});

// 9. GET /segnalazioni/:id - Caso esistente
test('GET /segnalazioni/:id - Record esistente', async () => {
  const resList = await fetch(`${BASE_URL}/segnalazioni`);
  assert.strictEqual(resList.status, 200);
  const lista = await resList.json();
  assert.ok(Array.isArray(lista));

  if (lista.length === 0) {
    const resCreate = await fetch(`${BASE_URL}/segnalazioni`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        titolo: 'Segnalazione di verifica GET by id',
        id_utente: 1,
        id_area: 1
      })
    });

    assert.ok(resCreate.status === 201 || resCreate.status === 200);
    const creata = await resCreate.json();
    const resOk = await fetch(`${BASE_URL}/segnalazioni/${creata.id}`);
    assert.strictEqual(resOk.status, 200);
    const body = await resOk.json();
    assert.strictEqual(body.id, creata.id);
    return;
  }

  const idValido = lista[0].id;
  const resOk = await fetch(`${BASE_URL}/segnalazioni/${idValido}`);
  assert.strictEqual(resOk.status, 200);
  const body = await resOk.json();
  assert.strictEqual(body.id, idValido);
});

// 10. GET /segnalazioni/:id - Caso ID inesistente
test('GET /segnalazioni/:id - Caso ID inesistente', async () => {
  const res = await fetch(`${BASE_URL}/segnalazioni/999999`);
  assert.strictEqual(res.status, 404);
  const body = await res.json();
  assert.ok(body.errore || body.message || body.error);
});

// 11. PATCH /segnalazioni/:id/stato - Transizione non ammessa
test('PATCH /segnalazioni/:id/stato - Transizione non ammessa', async () => {
  const resCreate = await fetch(`${BASE_URL}/segnalazioni`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      titolo: 'Segnalazione per transizione invalida',
      descrizione: 'Verifica blocco transizione',
      id_utente: 1,
      id_area: 3
    })
  });

  assert.ok(resCreate.status === 201 || resCreate.status === 200);
  const creata = await resCreate.json();

  const resInvalid = await fetch(`${BASE_URL}/segnalazioni/${creata.id}/stato`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stato: 'chiusa' })
  });

  assert.strictEqual(resInvalid.status, 400);
  const body = await resInvalid.json();
  assert.ok(body.errore || body.message || body.error);
});

// 12. GET /segnalazioni/stati - Controllo dettagli transizioni e stato iniziale
test('GET /segnalazioni/stati - Controllo completo struttura dati', async () => {
  const res = await fetch(`${BASE_URL}/segnalazioni/stati`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.stati));
  assert.ok(body.stati.includes('ricevuta'));
  assert.ok(body.stati.includes('valutata'));
  assert.ok(body.stati.includes('chiusa'));
  assert.ok(body.transizioni);
  assert.strictEqual(body.transizioni.ricevuta[0], 'valutata');
  assert.ok(Array.isArray(body.transizioni.chiusa));
});