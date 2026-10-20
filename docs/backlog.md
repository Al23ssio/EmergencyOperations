# Product Backlog – Emergency Operations

Questo documento raccoglie il backlog di prodotto strutturato in **User Story** (orientate al valore per il cliente *Territorio Sicuro Consorzio*) e **Issue Tecniche / Correttive** (emerse dalle revisioni architetturali e di laboratorio).

**Legenda Priorità:** 🔴 Critica (Bloccante / MVP) | 🟠 Alta | 🟡 Media | 🟢 Bassa  
**Legenda Stato:** `DONE` (Completato) | `IN PROGRESS` (In lavorazione) | `TODO` (Da fare)

---

## EPIC 1: Allineamento Tecnico, Persistenza e Correzioni Sprint Attuale (Scadenza 21/10/2026)
*Obiettivo: Risolvere il debito tecnico evidenziato nella code review, completare lo schema DB e consolidare le validazioni del backend.*

| ID | Tipo | Titolo / Descrizione | Criteri di Accettazione (DoD) | Assegnatario | Priorità | Stato |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **ISS-01** | Docs | **Analisi ambiguità e domande al cliente** | Creazione del file `domande-cliente.md` con quesiti su foto, coordinate, stati, notifiche e AI. | Ignat | 🔴 Critica | `DONE` |
| **ISS-02** | Docs | **Strutturazione Product Backlog** | Creazione del file `backlog.md` con User Story del cliente e Issue operative del team. | Ignat | 🔴 Critica | `DONE` |
| **ISS-03** | Docs | **Allineamento endpoint e pulizia `.md`** | Correzione rotte in `use-cases.md` (es. `PATCH /segnalazioni/:id/stato`) e rimozione testi guida template dai file `.md`. | Ignat | 🟠 Alta | `IN PROGRESS` |
| **ISS-04** | DB | **Completamento `db/schema.sql`** | Allineamento a `data-model.md` con aggiunta tabelle mancanti (`squadra`, `assegnazione`, `nota`, `allegato`, `storico_modifica`, `suggerimento_ai`). | Sabrina | 🔴 Critica | `TODO` |
| **ISS-05** | DevOps | **Auto-init Database in Docker Compose** | Configurazione di `docker-compose.yml` per eseguire automaticamente `db/schema.sql` all'avvio del container PostgreSQL. | Sabrina | 🟠 Alta | `TODO` |
| **ISS-06** | DevOps | **Configurazione ambiente e pulizia repo** | Creazione di `.env.example`, aggiornamento `README.md` con stack/istruzioni reali e rimozione del file obsoleto `src/interventi/lista.js`. | Sabrina | 🟡 Media | `TODO` |
| **ISS-07** | Backend | **Macchina a stati in `PATCH /segnalazioni/:id/stato`** | Validazione rigorosa delle transizioni (`ricevuta` → `valutata` → `assegnata` → `in_intervento` → `risolta` → `chiusa`), errore `400 Bad Request` per transizioni illecite e valorizzazione corretta di `chiusa_il`. | Alessio | 🔴 Critica | `TODO` |
| **ISS-08** | API Docs | **Specifica contratti API e nota limiti noti** | Stesura prima bozza `openapi.yaml` / `docs/api.md` per gli endpoint principali e documentazione del limite noto su `id_utente` passato nel body. | Alessio | 🟠 Alta | `TODO` |
| **ISS-09** | QA / Test | **Suite di test automatici sugli endpoint** | Creazione test in `tests/` con almeno 1 happy path e 1 caso d'errore per ciascun endpoint (`POST`, `GET`, `PATCH`) + verifica manuale API. | Carmen | 🔴 Critica | `TODO` |
| **ISS-10** | Frontend | **Integrazione base "Filo Frontend-Backend"** | Creazione di una vista web HTML/JS collegata agli endpoint reali del backend (es. lista segnalazioni da DB) senza utilizzo di dati mock. | Carmen | 🟠 Alta | `DONE` |

---

## EPIC 2: Gestione Core delle Segnalazioni (Requisiti Cliente 3, 4, 5)
*Obiettivo: Permettere la raccolta centralizzata, la consultazione e l'aggiornamento di stato delle segnalazioni territoriali.*

* **US-01: Registrazione nuova segnalazione** 🔴 [`DONE` - Lab Punto 4]
  * *Come* Operatore di front-office / Segnalatore,
  * *Voglio* registrare una nuova segnalazione inserendo titolo, descrizione, indirizzo/coordinate, area, categoria e canale di ingresso,
  * *Affinché* l'evento sia salvato in modo persistente nel database con stato iniziale `ricevuta`.
  * **Criteri di accettazione:** Endpoint `POST /segnalazioni` funzionante; validazione campi obbligatori (`titolo`, `id_utente`, `id_area`); salvataggio data con fuso orario (`TIMESTAMPTZ`).

* **US-02: Consultazione elenco e dettaglio segnalazioni** 🔴 [`DONE` - Lab Punto 4]
  * *Come* Operatore di centrale / Responsabile,
  * *Voglio* visualizzare la lista di tutte le segnalazioni e il dettaglio di una singola segnalazione tramite ID,
  * *Affinché* io possa monitorare le criticità aperte e concluse sul territorio.
  * **Criteri di accettazione:** Endpoint `GET /segnalazioni` e `GET /segnalazioni/:id`; risposta `404 Not Found` se l'ID non esiste.

* **US-03: Ricerca e filtri operativi** 🟠 [`TODO`]
  * *Come* Operatore di centrale / Responsabile,
  * *Voglio* filtrare le segnalazioni per categoria, priorità, stato, area, squadra e intervallo temporale,
  * *Affinché* io possa individuare rapidamente le emergenze più urgenti anche in presenza di molte segnalazioni.
  * **Criteri di accettazione:** Supporto query params su `GET /segnalazioni` (es. `?priorita=alta&stato=ricevuta&id_area=1`).

---

## EPIC 3: Coordinamento Squadre, Note e Storico (Requisiti Cliente 3, 5, 8)
*Obiettivo: Gestire l'assegnazione degli interventi sul campo, le comunicazioni operative e l'audit trail completo.*

* **US-04: Assegnazione intervento a una squadra** 🟠 [`TODO`]
  * *Come* Operatore di centrale,
  * *Voglio* assegnare una segnalazione valutata a una squadra operativa disponibile sul territorio,
  * *Affinché* la squadra possa prendere in carico l'intervento.
  * **Criteri di accettazione:** Creazione record nella tabella `assegnazione`; passaggio di stato a `assegnata`; tracciamento timestamp `assegnata_il`.

* **US-05: Inserimento note operative e allegati fotografici** 🟡 [`TODO`]
  * *Come* Squadra sul territorio / Operatore,
  * *Voglio* aggiungere note testuali e allegare fotografie a una segnalazione in corso,
  * *Affinché* resti evidenza documentale del sopralluogo e delle operazioni svolte.
  * **Criteri di accettazione:** Salvataggio metadati foto nella tabella `allegato` e commenti nella tabella `nota` collegati alla segnalazione.

* **US-06: Consultazione dello storico modifiche (Audit Log)** 🟠 [`TODO`]
  * *Come* Responsabile / Operatore di centrale,
  * *Voglio* consultare lo storico completo dei cambi di stato, priorità e assegnazione di una segnalazione,
  * *Affinché* ogni modifica significativa sia tracciata e verificabile (chi ha modificato cosa e quando).
  * **Criteri di accettazione:** Scrittura automatica nella tabella `storico_modifica` ad ogni variazione rilevante ed endpoint di lettura dedicato.

---

## EPIC 4: Supporto Intelligenza Artificiale (Requisito Cliente 10)
*Obiettivo: Assistere l'operatore nella classificazione e prioritizzazione rapida degli eventi.*

* **US-07: Suggerimento automatico di categoria e priorità tramite AI** 🟡 [`TODO`]
  * *Come* Operatore di centrale,
  * *Voglio* ricevere un suggerimento automatico di categoria e priorità basato sul testo della descrizione con relativo livello di confidenza,
  * *Affinché* io possa velocizzare la fase di triage mantenendo il controllo finale tramite validazione umana.
  * **Criteri di accettazione:** Salvataggio proposta in `suggerimento_ai`; indicazione visiva chiara che il dato è generato da AI; obbligo di conferma/rifiuto da parte dell'operatore.

---

## EPIC 5: Sicurezza, Monitoraggio e Affidabilità (Requisiti Cliente 6, 7, 9)
*Obiettivo: Garantire il controllo degli accessi basato sui ruoli e la diagnosticabilità del sistema.*

* **US-08: Monitoraggio salute applicativa e database (`/health`)** 🔴 [`DONE` - Lab Punto 3]
  * *Come* Amministratore / Tecnico di supporto,
  * *Voglio* interrogare un endpoint di health-check che verifichi lo stato del server e la connessione al database PostgreSQL,
  * *Affinché* io possa distinguere immediatamente un guasto applicativo da un'irraggiungibilità del database.

* **US-09: Autenticazione e controllo accessi per ruolo (RBAC)** 🟠 [`TODO`]
  * *Come* Amministratore,
  * *Voglio* che ogni utente acceda tramite credenziali sicure e possa eseguire solo le operazioni consentite dal proprio ruolo (`segnalatore`, `operatore_centrale`, `squadra`, `responsabile`, `amministratore`),
  * *Affinché* le informazioni operative siano protette e l'identità dell'utente non debba essere passata manualmente nel body della richiesta.
