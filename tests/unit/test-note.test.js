const assert = require('node:assert');
const { test, describe } = require('node:test');

// Funzione di validazione pura (logica di business isolata)
function validaInputNota(payload) {
    if (!payload) {
        return { valido: false, errore: 'Payload mancante' };
    }
    const { id_utente, testo } = payload;
    
    if (id_utente === undefined || id_utente === null) {
        return { valido: false, errore: 'id_utente obbligatorio' };
    }
    if (testo === undefined || testo === null || String(testo).trim() === '') {
        return { valido: false, errore: 'testo obbligatorio' };
    }
    return { valido: true };
}

describe('Unit Test — Logica di Business Note', () => {
    
    // 1. Happy Path
    test('Happy Path: payload valido passa la validazione', () => {
        const input = { id_utente: 1, testo: 'Intervento completato' };
        const risultato = validaInputNota(input);
        assert.strictEqual(risultato.valido, true);
    });

    // 2. Caso Negativo 1: id_utente mancante
    test('Caso Negativo 1: id_utente assente fallisce la validazione', () => {
        const input = { testo: 'Nota senza utente' };
        const risultato = validaInputNota(input);
        assert.strictEqual(risultato.valido, false);
        assert.strictEqual(risultato.errore, 'id_utente obbligatorio');
    });

    // 3. Caso Negativo 2: testo vuoto
    test('Caso Negativo 2: testo vuoto o solo spazi fallisce la validazione', () => {
        const input = { id_utente: 1, testo: '   ' };
        const risultato = validaInputNota(input);
        assert.strictEqual(risultato.valido, false);
        assert.strictEqual(risultato.errore, 'testo obbligatorio');
    });

    // 4. Caso Negativo 3: payload totalmente nullo
    test('Caso Negativo 3: payload nullo restituisce errore', () => {
        const risultato = validaInputNota(null);
        assert.strictEqual(risultato.valido, false);
        assert.strictEqual(risultato.errore, 'Payload mancante');
    });
});