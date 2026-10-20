# Emergency Operations - Territorio Sicuro Consorzio

|  |  |
| :---- | :---- |
| **Cliente** | Territorio Sicuro Consorzio |
| **Team** | Team 3 |
| **Membri** | Alessio Innocenti, Gabriel Ignat, Sabrina Spaneshi, Carmen Nuvoli |
| **Data** | 30/09/2026 |
| **Versione** | v0.1 |

## Cosa fa questo progetto

Piattaforma condivisa per la gestione del ciclo completo delle segnalazioni sul territorio (viabilità, dissesti, allagamenti), dall'inserimento all'assegnazione alle squadre operative.

## Stack

Stack: Node.js + Express
Frontend: React
Database: PostgreSQL

## Come si esegue

1. Avviare il database PostgreSQL con Docker Compose.
2. Eseguire il server Node.js:
   - `npm install`
   - `node src/server.js`
3. Verificare gli endpoint via `prove.http` o tramite client REST.

## Struttura del repository

.
├── README.md            questo file
├── CONTRIBUTING.md       come contribuire: branch, commit, Definition of Done
├── openapi.yaml         prima bozza di documentazione OpenAPI
├── docs/
│   ├── requirements.md   requisiti (lezione 1)
│   ├── use-cases.md      casi d'uso (lezione 1)
│   ├── architecture-v1.md architettura (lezione 1)
│   └── api.md            documentazione API delle funzionalità principali
├── src/
│   ├── db.js             connessione al database
│   ├── server.js         bootstrap dell'API Express
│   ├── segnalazioni.js   CRUD e gestione stato segnalazioni
│   └── interventi/
│       └── listra.js     lista e filtro interventi, aggiornamento stato
├── public/              frontend statico iniziale
├── db/
│   └── schema.sql       schema del database
├── docker-compose.yml   configurazione del database
├── prove.http           richieste HTTP di test manuali
└── .env                 variabili d'ambiente locali

## Stato del progetto

Feature implementate:
- creazione e lettura segnalazioni
- `PATCH /segnalazioni/:id/stato` con state machine valida
- blocco transizioni non consentite con `400 Bad Request`
- gestione di `chiusa_il` solo allo stato `chiusa`
- endpoint `GET /segnalazioni/stati` per introspezione della macchina a stati
- filtro interventi per tecnico e aggiornamento `PATCH /interventi/:id`
- documentazione OpenAPI iniziale e documentazione API

Limite noto:
- il campo `id_utente` è ancora ricevuto dal body, in attesa dell'autenticazione. In futuro verrà preso dal token/sessione dell'utente autenticato.

## Come contribuire

Branch strategy, convenzioni di commit e Definition of Done sono in [`CONTRIBUTING.md`](./CONTRIBUTING.md) — leggetelo prima di aprire il primo branch.
