// Test di integrazione: assegnazione a una squadra o a una persona,
// visibilita dei compiti e aggiornamento dello stato da parte di chi li ha in carico.
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

// Utenti di prova: lbianchi (id 2) = Squadra Nord, gverdi (id 3) = Squadra Centro
describe('Assegnazione dei compiti a persone e squadre', () => {
  const token = {};
  let idPersona;   // segnalazione assegnata a Luca Bianchi (persona)
  let idSquadra;   // segnalazione assegnata alla Squadra Centro (gruppo)

  async function nuovaValutata(titolo) {
    const creata = await chiama('POST', '/segnalazioni', token.operatore, { titolo, id_area: 1 });
    assert.strictEqual(creata.status, 201);
    const valutata = await chiama('PATCH', `/segnalazioni/${creata.data.id}/stato`, token.operatore, { stato: 'valutata' });
    assert.strictEqual(valutata.status, 200);
    return creata.data.id;
  }

  before(async () => {
    token.operatore = await login(BASE_URL, 'mrossi');
    token.bianchi = await login(BASE_URL, 'lbianchi');
    token.verdi = await login(BASE_URL, 'gverdi');
    token.responsabile = await login(BASE_URL, 'pgialli');
    token.segnalatore = await login(BASE_URL, 'aneri');
    idPersona = await nuovaValutata('Compito per Luca');
    idSquadra = await nuovaValutata('Compito per la Squadra Centro');
  });

  test('GET /squadre: l\'operatore vede squadre e componenti, il segnalatore no (403)', async () => {
    const { status, data } = await chiama('GET', '/squadre', token.operatore);
    assert.strictEqual(status, 200);
    const nord = data.find((sq) => sq.nome === 'Squadra Nord');
    assert.ok(nord.membri.some((m) => m.username === 'lbianchi'));
    assert.strictEqual((await chiama('GET', '/squadre', token.segnalatore)).status, 403);
  });

  test('non si puo assegnare una segnalazione ancora "ricevuta" (400)', async () => {
    const creata = await chiama('POST', '/segnalazioni', token.operatore, { titolo: 'Non valutata', id_area: 1 });
    const { status } = await chiama('POST', `/segnalazioni/${creata.data.id}/assegna`, token.operatore, { id_squadra: 1 });
    assert.strictEqual(status, 400);
  });

  test('squadra E persona insieme, o nessuna delle due -> 400', async () => {
    const percorso = `/segnalazioni/${idPersona}/assegna`;
    assert.strictEqual((await chiama('POST', percorso, token.operatore, { id_squadra: 1, id_utente_assegnato: 2 })).status, 400);
    assert.strictEqual((await chiama('POST', percorso, token.operatore, {})).status, 400);
  });

  test('la persona deve avere ruolo "squadra" (assegnare al responsabile -> 400)', async () => {
    const { status } = await chiama('POST', `/segnalazioni/${idPersona}/assegna`, token.operatore, { id_utente_assegnato: 5 });
    assert.strictEqual(status, 400);
  });

  test('"assegnata" non si imposta a mano con PATCH (400)', async () => {
    const { status } = await chiama('PATCH', `/segnalazioni/${idPersona}/stato`, token.operatore, { stato: 'assegnata' });
    assert.strictEqual(status, 400);
  });

  test('assegna a una PERSONA: stato "assegnata" e nome nella risposta', async () => {
    const { status, data } = await chiama('POST', `/segnalazioni/${idPersona}/assegna`, token.operatore, { id_utente_assegnato: 2 });
    assert.strictEqual(status, 201);
    assert.strictEqual(data.stato, 'assegnata');
    assert.strictEqual(data.id_utente_assegnato, 2);
    assert.strictEqual(data.utente_assegnato, 'Luca Bianchi');
    assert.strictEqual(data.id_squadra_assegnata, null);
  });

  test('assegna a una SQUADRA intera', async () => {
    const { status, data } = await chiama('POST', `/segnalazioni/${idSquadra}/assegna`, token.operatore, { id_squadra: 2 });
    assert.strictEqual(status, 201);
    assert.strictEqual(data.squadra_assegnata, 'Squadra Centro');
  });

  test('ognuno vede SOLO i compiti assegnati a lui o alla sua squadra', async () => {
    const bianchi = (await chiama('GET', '/segnalazioni', token.bianchi)).data.map((s) => s.id);
    const verdi = (await chiama('GET', '/segnalazioni', token.verdi)).data.map((s) => s.id);
    assert.ok(bianchi.includes(idPersona) && !bianchi.includes(idSquadra));
    assert.ok(verdi.includes(idSquadra) && !verdi.includes(idPersona));
    assert.strictEqual((await chiama('GET', `/segnalazioni/${idPersona}`, token.verdi)).status, 403);
  });

  test('chi non ha il compito non puo cambiarne lo stato (403)', async () => {
    const { status } = await chiama('PATCH', `/segnalazioni/${idPersona}/stato`, token.verdi, { stato: 'in_intervento' });
    assert.strictEqual(status, 403);
  });

  test('chi ha il compito lo porta a "in_intervento" e poi "risolta"', async () => {
    const percorso = `/segnalazioni/${idPersona}/stato`;
    const inizio = await chiama('PATCH', percorso, token.bianchi, { stato: 'in_intervento' });
    assert.strictEqual(inizio.status, 200);
    const fine = await chiama('PATCH', percorso, token.bianchi, { stato: 'risolta' });
    assert.strictEqual(fine.status, 200);
    assert.strictEqual(fine.data.stato, 'risolta');
  });

  test('la squadra NON puo chiudere (403): chiude l\'operatore dopo la verifica', async () => {
    const percorso = `/segnalazioni/${idPersona}/stato`;
    assert.strictEqual((await chiama('PATCH', percorso, token.bianchi, { stato: 'chiusa' })).status, 403);
    const chiusa = await chiama('PATCH', percorso, token.operatore, { stato: 'chiusa' });
    assert.strictEqual(chiusa.status, 200);
    assert.ok(chiusa.data.chiusa_il, 'deve avere la data di chiusura');
  });

  test('riassegnazione: il compito passa dalla Squadra Centro a Luca, e Giulia non lo vede piu', async () => {
    const { status, data } = await chiama('POST', `/segnalazioni/${idSquadra}/assegna`, token.operatore, { id_utente_assegnato: 2 });
    assert.strictEqual(status, 201);
    assert.strictEqual(data.id_squadra_assegnata, null);
    const verdi = (await chiama('GET', '/segnalazioni', token.verdi)).data.map((s) => s.id);
    assert.ok(!verdi.includes(idSquadra));
  });

  test('lo storico registra le assegnazioni', async () => {
    const { data } = await chiama('GET', `/segnalazioni/${idSquadra}/storico`, token.responsabile);
    const assegnazioni = data.filter((r) => r.tipo_evento === 'assegnazione');
    assert.strictEqual(assegnazioni.length, 2);
  });
});
