// Test di integrazione: login reale (JWT) e permessi dei 5 ruoli (RBAC).
// Serve il backend avviato con il database creato da db/schema.sql.
const assert = require('node:assert');
const { test, describe, before } = require('node:test');
const { login } = require('../login-helper');

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';

async function chiama(metodo, percorso, token, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE_URL}${percorso}`, {
    method: metodo,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

describe('Login con il database', () => {
  test('credenziali giuste -> 200 con token e ruolo', async () => {
    const { status, data } = await chiama('POST', '/api/auth/login', null, { username: 'admin', password: 'Password123!' });
    assert.strictEqual(status, 200);
    assert.ok(data.token, 'manca il token');
    assert.strictEqual(data.user.role, 'amministratore');
    assert.strictEqual(data.user.password_hash, undefined, 'l\'hash non deve mai uscire dal backend');
  });

  test('login anche con l\'email', async () => {
    const { status } = await chiama('POST', '/api/auth/login', null, { username: 'anna.neri@example.com', password: 'Password123!' });
    assert.strictEqual(status, 200);
  });

  test('password sbagliata -> 401 con messaggio generico', async () => {
    const { status, data } = await chiama('POST', '/api/auth/login', null, { username: 'admin', password: 'sbagliata' });
    assert.strictEqual(status, 401);
    assert.strictEqual(data.message, 'Credenziali non valide');
  });

  test('utente inesistente -> stesso 401 e stesso messaggio', async () => {
    const { status, data } = await chiama('POST', '/api/auth/login', null, { username: 'nessuno', password: 'Password123!' });
    assert.strictEqual(status, 401);
    assert.strictEqual(data.message, 'Credenziali non valide');
  });

  test('campi mancanti -> 400', async () => {
    const { status } = await chiama('POST', '/api/auth/login', null, { username: 'admin' });
    assert.strictEqual(status, 400);
  });
});

describe('Token JWT', () => {
  test('senza token -> 401', async () => {
    const { status } = await chiama('GET', '/segnalazioni');
    assert.strictEqual(status, 401);
  });

  test('token falso -> 401', async () => {
    const { status } = await chiama('GET', '/segnalazioni', 'token.inventato.123');
    assert.strictEqual(status, 401);
  });
});

describe('Permessi dei 5 ruoli (matrice RBAC)', () => {
  const token = {};
  let idSegnalazione;

  before(async () => {
    token.segnalatore = await login(BASE_URL, 'aneri');
    token.operatore = await login(BASE_URL, 'mrossi');
    token.squadraNord = await login(BASE_URL, 'lbianchi');   // Squadra Nord (id 1)
    token.squadraCentro = await login(BASE_URL, 'gverdi');   // Squadra Centro (id 2)
    token.responsabile = await login(BASE_URL, 'pgialli');
    token.admin = await login(BASE_URL, 'admin');
  });

  test('POST /segnalazioni: segnalatore SI (201), autore preso dal token', async () => {
    const { status, data } = await chiama('POST', '/segnalazioni', token.segnalatore,
      { titolo: 'Test RBAC', id_area: 1, id_utente: 999 });
    assert.strictEqual(status, 201);
    assert.strictEqual(data.id_utente, 4, 'l\'autore deve essere aneri (id 4), non quello del body');
    idSegnalazione = data.id;
  });

  test('POST /segnalazioni: squadra e responsabile NO (403)', async () => {
    const body = { titolo: 'Non permesso', id_area: 1 };
    assert.strictEqual((await chiama('POST', '/segnalazioni', token.squadraNord, body)).status, 403);
    assert.strictEqual((await chiama('POST', '/segnalazioni', token.responsabile, body)).status, 403);
  });

  test('GET /segnalazioni: il segnalatore vede solo le proprie', async () => {
    const { status, data } = await chiama('GET', '/segnalazioni', token.segnalatore);
    assert.strictEqual(status, 200);
    assert.ok(data.length >= 1);
    assert.ok(data.every((s) => s.id_utente === 4));
  });

  test('GET /segnalazioni: responsabile vede tutto', async () => {
    const { status, data } = await chiama('GET', '/segnalazioni', token.responsabile);
    assert.strictEqual(status, 200);
    assert.ok(data.some((s) => s.id === idSegnalazione));
  });

  test('PATCH stato: responsabile e segnalatore NO (403)', async () => {
    const percorso = `/segnalazioni/${idSegnalazione}/stato`;
    assert.strictEqual((await chiama('PATCH', percorso, token.responsabile, { stato: 'valutata' })).status, 403);
    assert.strictEqual((await chiama('PATCH', percorso, token.segnalatore, { stato: 'valutata' })).status, 403);
  });

  test('PATCH stato: operatore ricevuta -> valutata SI (200)', async () => {
    const { status, data } = await chiama('PATCH', `/segnalazioni/${idSegnalazione}/stato`, token.operatore, { stato: 'valutata' });
    assert.strictEqual(status, 200);
    assert.strictEqual(data.stato, 'valutata');
  });

  test('assegnazione: squadra NO (403), operatore SI (201)', async () => {
    const percorso = `/segnalazioni/${idSegnalazione}/assegna`;
    assert.strictEqual((await chiama('POST', percorso, token.squadraNord, { id_squadra: 1 })).status, 403);
    assert.strictEqual((await chiama('POST', percorso, token.operatore, { id_squadra: 1 })).status, 201);
    const { status } = await chiama('PATCH', `/segnalazioni/${idSegnalazione}/stato`, token.operatore, { stato: 'assegnata' });
    assert.strictEqual(status, 200);
  });

  test('GET /segnalazioni: la squadra vede solo quelle assegnate a lei', async () => {
    const nord = await chiama('GET', '/segnalazioni', token.squadraNord);
    const centro = await chiama('GET', '/segnalazioni', token.squadraCentro);
    assert.ok(nord.data.some((s) => s.id === idSegnalazione));
    assert.ok(!centro.data.some((s) => s.id === idSegnalazione));
    const dettaglio = await chiama('GET', `/segnalazioni/${idSegnalazione}`, token.squadraCentro);
    assert.strictEqual(dettaglio.status, 403);
  });

  test('PATCH stato: operatore NON puo mettere in_intervento (403)', async () => {
    const { status } = await chiama('PATCH', `/segnalazioni/${idSegnalazione}/stato`, token.operatore, { stato: 'in_intervento' });
    assert.strictEqual(status, 403);
  });

  test('PATCH stato: squadra non assegnata NO (403), squadra assegnata SI (200)', async () => {
    const percorso = `/segnalazioni/${idSegnalazione}/stato`;
    assert.strictEqual((await chiama('PATCH', percorso, token.squadraCentro, { stato: 'in_intervento' })).status, 403);
    const { status, data } = await chiama('PATCH', percorso, token.squadraNord, { stato: 'in_intervento' });
    assert.strictEqual(status, 200);
    assert.strictEqual(data.stato, 'in_intervento');
  });

  test('POST note: tutti e 5 i ruoli SI (201)', async () => {
    const percorso = `/segnalazioni/${idSegnalazione}/note`;
    for (const t of [token.segnalatore, token.operatore, token.squadraNord, token.responsabile, token.admin]) {
      const { status } = await chiama('POST', percorso, t, { testo: 'Nota di prova RBAC' });
      assert.strictEqual(status, 201);
    }
  });

  test('GET /utenti: solo amministratore (200), gli altri 403', async () => {
    const admin = await chiama('GET', '/utenti', token.admin);
    assert.strictEqual(admin.status, 200);
    assert.ok(admin.data.every((u) => u.password_hash === undefined));
    for (const t of [token.segnalatore, token.operatore, token.squadraNord, token.responsabile]) {
      assert.strictEqual((await chiama('GET', '/utenti', t)).status, 403);
    }
  });

  test('POST /utenti: admin crea un utente che poi fa login', async () => {
    const username = `nuovo${Date.now()}`;
    const crea = await chiama('POST', '/utenti', token.admin, {
      username, email: `${username}@example.com`, password: 'Segreta123!', ruolo: 'responsabile'
    });
    assert.strictEqual(crea.status, 201);
    assert.strictEqual(crea.data.password_hash, undefined);

    const doppio = await chiama('POST', '/utenti', token.admin, {
      username, email: `${username}@example.com`, password: 'Segreta123!', ruolo: 'responsabile'
    });
    assert.strictEqual(doppio.status, 409);

    const accesso = await chiama('POST', '/api/auth/login', null, { username, password: 'Segreta123!' });
    assert.strictEqual(accesso.status, 200);
    assert.strictEqual(accesso.data.user.role, 'responsabile');
  });
});
