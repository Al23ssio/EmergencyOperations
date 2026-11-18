# Report Integrazione End-to-End Multi-Ambiente (Passo 3)

**Responsabile:** Gabriel Ignat (End-to-End Integration & Deployment Lead)  
**Data:** 04/11/2026  

## 1. Esecuzione con la stessa immagine nei due ambienti

L'immagine container `localhost:32000/emergency-operations-backend:1.0.0` viene eseguita senza alcuna modifica al codice sorgente iniettando alternativamente i file di configurazione `config/dev.env` e `config/test.env`.

### Avvio in ambiente DEV (`config/dev.env` - Porta 3000)
```bash
ENV_FILE=config/dev.env PORT=3000 docker compose up -d
node tests/e2e-multi-env.js




# Report di Test API - Segnalazioni (Passo 4)
**Ruolo:** AI Test Engineer (Ignat)

## 1. Esecuzione Test
La suite di test per la feature "Segnalazioni" è stata generata tramite AI (usando Jest e Supertest) ed eseguita con successo. Tutti i test implementati sono passati (6/6).

## 2. Tabella dei Test (Tenuti vs Scartati)

### ✅ Test Tenuti (Implementati nel codice)
| Nome del Test | Categoria | Motivazione |
| :--- | :--- | :--- |
| **Creazione segnalazione valida (HTTP 201)** | Happy Path | Verifica il core business logic dell'inserimento dei dati obbligatori nel DB. |
| **Recupero lista segnalazioni (HTTP 200)** | Happy Path | Conferma che l'endpoint di lettura generale risponda correttamente e restituisca un array. |
| **Avanzamento stato valido (ricevuta -> valutata)** | Happy Path | Assicura che la macchina a stati definita nel backend accetti le transizioni consentite. |
| **Creazione senza campi obbligatori (HTTP 400)** | Caso Negativo | Previene crash del database e garantisce che l'API restituisca un errore strutturato se il body è incompleto. |
| **Transizione stato non consentita (HTTP 400)** | Caso Negativo | Verifica la solidità del validatore interno, impedendo salti di stato anomali (es. `ricevuta` -> `risolta`). |
| **Ricerca segnalazione inesistente (HTTP 404)** | Edge Case | Gestisce correttamente le richieste verso risorse non presenti nel database, evitando errori 500. |

### ❌ Test Scartati (Non implementati)
| Nome del Test | Categoria | Motivazione |
| :--- | :--- | :--- |
| **Iniezione SQL nei parametri (SQL Injection)** | Sicurezza | Scartato. La libreria `pg` unita all'uso esclusivo di parametri posizionali (`$1, $2`) nel modulo `db.js` rende i test di SQL injection ridondanti a questo livello, in quanto sanitizzati nativamente dal driver. |
| **Test di carico / Stress Test (es. 10k req/sec)** | Stress | Scartato. Fuori scopo per una suite di test di integrazione dell'API tramite Supertest. Richiederebbe strumenti esterni (es. k6, JMeter) e appesantirebbe inutilmente la pipeline. |
| **Autenticazione / Autorizzazione utente** | Security | Scartato. Attualmente nel file `segnalazioni.js` il sistema di login non è implementato (è presente un `TODO` nel codice), quindi l'`id_utente` viene preso direttamente dal body. |