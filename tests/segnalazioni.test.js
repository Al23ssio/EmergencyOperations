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

// 2. GET /segnalazioni - Happy Path
test('GET /segnalazioni - Happy Path: Recupera la lista delle segnalazioni', async () => {
  const res = await fetch(`${BASE_URL}/segnalazioni`);
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
});

// 3. POST /segnalazioni - Caso Errore
test('POST /segnalazioni - Caso Errore: Body vuoto o non valido', async () => {
  const res = await fetch(`${BASE_URL}/segnalazioni`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  assert.ok(res.status >= 400);
});

// 4. PATCH /segnalazioni/:id/stato - Caso Errore
test('PATCH /segnalazioni/:id/stato - Caso Errore: ID inesistente', async () => {
  const res = await fetch(`${BASE_URL}/segnalazioni/999999/stato`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stato: 'chiusa' })
  });
  assert.ok(res.status >= 400);
});