const assert = require('node:assert');
const { test, describe } = require('node:test');

describe('Test di Regressione — Bug Errore 500 PATCH Stato', () => {
    test('PATCH /segnalazioni/:id/stato aggiorna lo stato senza dare errore 500', async () => {
        const res = await fetch('http://localhost:3000/segnalazioni/1/stato', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ stato: 'valutata', id_utente: 1 })
        });
        
        assert.notStrictEqual(res.status, 500, 'L\'endpoint non deve restituire 500 Internal Server Error');
    });
});