# Emergency Operations - Territorio Sicuro Consorzio

|  |  |
| :---- | :---- |
| **Cliente** | Territorio Sicuro Consorzio |
| **Team** | Team 3 |
| **Membri** | Alessio Innocenti, Gabriel Ignat, Sabrina Spaneshi, Carmen Nuvoli |
| **Data** | 30/09/2026 |
| **Versione** | v0.2 |

## Cosa fa questo progetto

Piattaforma condivisa per la gestione del ciclo completo delle segnalazioni sul territorio (viabilità, dissesti, allagamenti), dall'inserimento all'assegnazione alle squadre operative.

## Stack

| Parte | Tecnologia |
| :---- | :---- |
| Backend (API REST) | Node.js 20+ con Express 5 |
| Database | PostgreSQL 16, avviato con Docker Compose |
| Accesso al database | libreria `pg` (query SQL parametrizzate) |
| Configurazione | variabili d'ambiente nel file `.env` (letto con `dotenv`) |
| Frontend | pagina statica HTML / CSS / JavaScript in `public/`, servita da Express |
| Test | test runner integrato di Node (`node --test`) |

## Requisiti

Programmi da avere installati sul computer:

- [Node.js](https://nodejs.org) versione 20 o superiore (con `npm`)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) — su Windows in modalità **Linux containers**
- Git

PostgreSQL **non** va installato: lo avvia Docker.

## Come si avvia il progetto

Tutti i comandi vanno lanciati nella cartella principale del progetto.
Su Windows usare **Git CMD** o il **Prompt dei comandi**: in PowerShell `npm` può essere bloccato.

**1. Creare il file `.env`** copiando l'esempio:

```
copy .env.example .env        (Windows)
cp .env.example .env          (Mac / Linux)
```

Poi, se si vuole, cambiare la password dentro `.env`. Il file `.env` non va mai caricato su GitHub.

**2. Installare le librerie:**

```
npm install
```

**3. Avviare il database** (con Docker Desktop aperto):

```
docker compose up -d
```

Al **primo avvio** Docker crea il database ed esegue da solo `db/schema.sql`: crea tutte le tabelle e inserisce i dati di prova (ruoli, utenti, squadre, aree, categorie). Non serve lanciare lo script a mano.

**4. Avviare il backend:**

```
npm start
```

Devono comparire `Database connesso` e `Server avviato su http://localhost:3000`.

**5. Verificare che funzioni:**

- http://localhost:3000/health → deve rispondere `{"server":"ok","database":"ok"}`
- http://localhost:3000 → pagina web con l'elenco delle segnalazioni
- `prove.http` → richieste di prova da inviare con l'estensione **REST Client** di VS Code

**6. Eseguire i test** (con il backend acceso, in un secondo terminale):

```
npm test
```

### Comandi utili per il database

| Comando | Cosa fa |
| :---- | :---- |
| `docker compose up -d` | accende il database |
| `docker compose down` | spegne il database, **i dati restano** |
| `docker compose down -v` | spegne e **cancella tutti i dati**: al prossimo `up` lo schema viene ricreato da zero |
| `docker compose ps` | mostra se il database è acceso (`healthy`) |

> `db/schema.sql` viene eseguito **solo quando il volume del database è vuoto**. Se lo schema cambia (per esempio dopo un `git pull`), per applicarlo bisogna lanciare `docker compose down -v` e poi `docker compose up -d`. Attenzione: questo cancella i dati presenti.

## Struttura del repository

```
.
├── README.md             questo file
├── CONTRIBUTING.md       come contribuire: branch, commit, Definition of Done
├── openapi.yaml          documentazione OpenAPI delle API
├── .env.example          esempio delle variabili d'ambiente (da copiare in .env)
├── docker-compose.yml    avvio del database PostgreSQL + esecuzione automatica dello schema
├── package.json          dipendenze e comandi npm (start, test)
├── prove.http            richieste HTTP di prova manuali
├── db/
│   └── schema.sql        tabelle, vincoli e dati di prova (allineato a docs/data-model.md)
├── docs/
│   ├── requirements.md   requisiti
│   ├── use-cases.md      casi d'uso
│   ├── architecture-v1.md architettura
│   ├── data-model.md     modello logico dei dati
│   ├── api.md            documentazione API
│   ├── backlog.md        product backlog e issue
│   └── domande-cliente.md domande aperte per il cliente
├── src/
│   ├── server.js         avvio dell'API Express e endpoint /health
│   ├── db.js             connessione al database (legge il file .env)
│   └── segnalazioni.js   CRUD e macchina a stati delle segnalazioni
├── public/               frontend statico (index.html, app.js, style.css)
└── tests/                test automatici degli endpoint
```

## Database

Lo schema in `db/schema.sql` contiene 12 tabelle, allineate a `docs/data-model.md`:

`ruolo`, `utente`, `squadra`, `squadra_utente`, `area`, `categoria`, `segnalazione`, `allegato`, `assegnazione`, `nota`, `storico_modifica`, `suggerimento_ai`.

Ogni tabella ha chiave primaria, chiavi esterne verso le tabelle collegate e vincoli `CHECK` sui valori ammessi (stati, priorità, canali, confidenza AI tra 0 e 1, date coerenti).

## Stato del progetto

Feature implementate:
- creazione e lettura segnalazioni
- `PATCH /segnalazioni/:id/stato` con macchina a stati
- blocco transizioni non consentite con `400 Bad Request`
- gestione di `chiusa_il` solo allo stato `chiusa`
- endpoint `GET /segnalazioni/stati` per vedere stati e transizioni ammesse
- endpoint `GET /health` per controllare server e database
- schema completo del database con creazione automatica tramite Docker
- documentazione OpenAPI iniziale e documentazione API

Limite noto:
- il campo `id_utente` è ancora ricevuto dal body, in attesa dell'autenticazione. In futuro verrà preso dal token/sessione dell'utente autenticato.

## Come contribuire

Branch strategy, convenzioni di commit e Definition of Done sono in [`CONTRIBUTING.md`](./CONTRIBUTING.md) — leggetelo prima di aprire il primo branch.

## Immagine Docker

Il backend (API + frontend statico) è containerizzato con il `Dockerfile` nella cartella principale.

| | |
| :---- | :---- |
| **Immagine** | `localhost:32000/emergency-operations-backend:1.0.0` |
| **Porta** | `3000` |
| **Variabili richieste** | `DB_HOST`, `DB_PORT`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` |
| **Health check** | `GET /health` |

Build e push:

    docker build -t emergency-operations-backend:1.0.0 .
    docker tag emergency-operations-backend:1.0.0 localhost:32000/emergency-operations-backend:1.0.0
    docker push localhost:32000/emergency-operations-backend:1.0.0

Il database usa l'immagine ufficiale `postgres:16`.
Ad ogni nuova versione si incrementa il tag (1.0.1, 1.1.0, ...): non si sovrascrive mai un tag già pubblicato.