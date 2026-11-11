# Test plan — Emergency Operations

| Progetto | Team / cliente | Data | Versione |
|---|---|---|---|
| Emergency Operations | Team Emergency | 11/11/2026 | v0.1 |

## Caso d'uso
Gestione delle note di intervento e validazione delle transizioni di stato della segnalazione.

## Matrice requisito → caso di test → esito

| # | Requisito / vincolo | Caso di test | Input / precondizioni | Risultato atteso | Tipo | Esito |
|---|---|---|---|---|---|---|
| 1 | Inserimento nota valido | Happy Path - creazione nota | Body con `id_utente` e `testo` validi | 201 Created | integration | passa (11/11) |
| 2 | Campo testo/utente obbligatorio | Caso negativo - dati mancanti | `id_utente` assente o `testo` vuoto/null | 400 Bad Request | unit | passa (11/11) |
| 3 | Segnalazione esistente | Caso negativo - ID non trovato | Request con `id_segnalazione` inesistente | 404 Not Found | integration | passa (11/11) |
| 4 | Transizione stato non valida | Caso negativo - stato errato | Cambio stato diretto non ammesso | 400 Bad Request | unit | passa (11/11) |