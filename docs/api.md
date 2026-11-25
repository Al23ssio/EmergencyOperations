# Documentazione API - Emergency Operations

## Endpoint principali

### GET /segnalazioni
Restituisce l'elenco completo delle segnalazioni.

### POST /segnalazioni
Crea una nuova segnalazione.

Campi principali:
- titolo: string, obbligatorio
- id_utente: integer, obbligatorio (temporaneo, in attesa dell'autenticazione)
- id_area: integer, obbligatorio
- descrizione: string, facoltativo
- priorita: string, facoltativo (`bassa`, `media`, `alta`, `urgente`)
- canale: string, facoltativo (`telefono`, `email`, `web`, `altro`)

### GET /segnalazioni/:id
Restituisce una segnalazione specifica.

### PATCH /segnalazioni/:id/stato
Aggiorna lo stato di una segnalazione.

Macchina a stati consentita:
- ricevuta -> valutata
- valutata -> assegnata
- assegnata -> in_intervento
- in_intervento -> risolta
- risolta -> chiusa

Tutte le altre transizioni restituiscono `400 Bad Request`.

Quando lo stato aggiornato è `chiusa`, il campo `chiusa_il` viene impostato a `now()` se era nullo; se la segnalazione è già chiusa e si tenta di cambiarla nuovamente, la transizione sarà considerata non valida.

## Nota sul limite attuale

Il campo `id_utente` è ancora ricevuto nel body della richiesta, perché il sistema di autenticazione non è stato implementato. Questo è un limite temporaneo: in futuro l'ID dell'utente autenticato dovrà essere preso dal token/sessione e non più dal payload della richiesta.

---

### GET /health
Verifica lo stato di salute del servizio backend e della connessione al database.

* **Metodo:** `GET`
* **URL:** `/health`
* **Risposta di Successo:**
  * **Codice:** `200 OK`
  * **Contenuto:**
    ```json
    {
        "server": "ok",
        "database": "ok",
        "environment": "development"
    }
    ```

---

### GET /segnalazioni/stati
Restituisce l'elenco di tutti gli stati possibili che una segnalazione può assumere.

* **Metodo:** `GET`
* **URL:** `/segnalazioni/stati`
* **Risposta di Successo:**
  * **Codice:** `200 OK`
  * **Contenuto:**
    ```json
    {
        "stati": [
          "ricevuta",
          "valutata",
          "assegnata",
          "in_intervento",
          "risolta",
          "chiusa"
  ],
        "transizioni": {
        "ricevuta": ["valutata", "chiusa"],
        "valutata": ["assegnata", "chiusa"],
       "assegnata": ["in_intervento", "valutata"],
        "in_intervento": ["risolta"],
        "risolta": ["chiusa", "in_intervento"],
        "chiusa": []
  }
    }