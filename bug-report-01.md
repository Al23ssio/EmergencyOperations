# Bug report — 01

| Progetto | Team / cliente | Data | Versione | Autore |
|---|---|---|---|---|
| Emergency Operations | Team Emergency | 11/11/2026 | v0.1 | Carmen |

## Sintomo
L'endpoint `PATCH /segnalazioni/:id/stato` rispondeva con errore `500 Internal Server Error` durante l'aggiornamento dello stato della segnalazione.

## Passi per riprodurre
1. Avviare l'applicazione Express ed il DB PostgreSQL.
2. Inviare una richiesta HTTP `PATCH` a `http://localhost:3000/segnalazioni/1/stato` con payload JSON `{"nuovo_stato": "in_corso"}`.
3. Riscontro dell'errore HTTP 500 restituito dal server.

## Causa
La query SQL di aggiornamento presentava mismatch sui tipi e sui nomi delle colonne, tentando di fare la UPDATE con sintassi errata e mancando il cast esplicito sui tipi di dato per PostgreSQL (`varchar`), scatenando un'eccezione non gestita nel driver `pg`.

## Correzione
Aggiornata la query SQL nel router `src/segnalazioni.js` introducendo il cast esplicito `$1::varchar`, la gestione condizionale `CASE` per il campo `chiusa_il` e la clausola `RETURNING *`.

## Test aggiunto
| Test | Percorso | Verifica |
|---|---|---|
| Test di Regressione PATCH Stato | tests/integration/test-bug-stato.test.js | Assicura che l'aggiornamento dello stato non generi errore 500 |

## Verifica di regressione
Eseguita l'intera suite tramite `node --test`: tutti i test risultano a verde (0 errori).