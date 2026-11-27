# Security Review & QA Audit — Emergency Operations

| Campo | Dettaglio |
| :--- | :--- |
| **Progetto** | Emergency Operations — Territorio Sicuro Consorzio |
| **Team** | Team 3 |
| **Ruoli coinvolti** | Persona 3 (Infra, Secret & Architettura) · Persona 4 (QA & Security Review) |
| **Data** | 27/11/2026 |
| **Versione** | v1.0 |

---

## 1. Checklist di Sicurezza (7 Voci)

| # | Controllo di Sicurezza | Esito | Evidenze e Riscontri nel Repository |
| :- | :--- | :---: | :--- |
| **1** | **Autenticazione e gestione token JWT** | **OK** (con note) | `POST /api/auth/login` (`src/auth.js`) verifica le credenziali su PostgreSQL usando `bcryptjs` (con `HASH_FITTIZIO` anti-timing enumeration) e firma un JWT `HS256` con scadenza (`JWT_EXPIRES_IN`, default `24h`). Il middleware `autentica` (`src/middleware/auth.js`) restituisce `401 Unauthorized` su header `Authorization: Bearer` assente, malformato o scaduto. *Nota client:* `public/app.js` salva il token in `localStorage` (`eo_auth_session`). |
| **2** | **Autorizzazione RBAC e isolamento dati (Scope)** | **OK** | Il middleware `autorizza(...ruoliAmmessi)` (`src/middleware/auth.js`) applica i 5 ruoli (`segnalatore`, `operatore_centrale`, `squadra`, `responsabile`, `amministratore`) restituendo `403 Forbidden` se non autorizzati. `filtroVisibilita()` (`src/segnalazioni.js`) limita il `segnalatore` alle sole segnalazioni create (`s.id_utente = $1`) e la `squadra` ai soli interventi assegnati personalmente o alla propria squadra. `id_utente` viene sempre estratto da `req.utente.id` e mai dal body. |
| **3** | **Validazione input e integrità macchina a stati** | **Parziale** (`C3`, `C4`) | `PATCH /segnalazioni/:id/stato` valida la sequenza lineare `ricevuta → valutata → assegnata → in_intervento → risolta → chiusa` con transazione `BEGIN ... FOR UPDATE` e `ROLLBACK` su errore (`400 Bad Request`). Tuttavia mancano controlli applicativi espliciti su formati/range di alcuni campi in `POST /segnalazioni` (es. `latitudine`, `longitudine`, tipi non stringa) e sull'ID numerico nei parametri route (`:id`). |
| **4** | **Audit segreti in codice, configurazioni e Git** | **Attenzione** (`C1`) | Nessuna password applicativa hardcoded in `src/auth.js` nello stato attuale. Tuttavia, `.gitignore` include l'eccezione `!config/dev.env` e `!config/test.env`, che espongono nel repository `POSTGRES_PASSWORD=lab123` e i valori `JWT_SECRET` di sviluppo/test. Inoltre `db/schema.sql` documenta in chiaro la password degli utenti di test (`Password123!`). |
| **5** | **Configurazioni Docker/K8s e dipendenze (`npm audit`)** | **OK** (con note) | `dockerfile` utilizza `node:22-alpine`, installa solo dipendenze di produzione (`npm ci --omit=dev`) ed esegue il processo con utente non privilegiato (`USER node`). `k8s/secret-example.yaml` contiene solo segnaposto (`cambiami-in-produzione`). `src/server.js` blocca l'avvio (*fail-fast*, exit code `1`) se manca una delle variabili `REQUIRED_ENV`. *Nota:* eseguire `npm audit --audit-level=moderate` sul `package-lock.json` locale per verificare eventuali advisory sulle dipendenze (`express@^5.3.0`, `pg@^8.23.1`, `jsonwebtoken@^9.0.2`, `bcryptjs@^3.0.2`). |
| **6** | **Protezione XSS lato client e fuga di dati sensibili** | **OK** | In `public/app.js` è definita la funzione `escapeHtml()` (riga 845), applicata a tutti i campi dinamici renderizzati nelle tabelle e nei menu (`titolo`, `descrizione`, `indirizzo`, `priorita`, `stato`, `squadra_assegnata`, `utente_assegnato`, `username`, `email`, `ruolo`). Lato backend, `password_hash` non viene mai incluso nei payload JWT né nelle risposte JSON (`/api/auth/login`, `/utenti`). |
| **7** | **Gestione errori HTTP, logging e suite di test** | **Parziale** (`C2`, `C5`) | `gestisciErrore()` in `src/segnalazioni.js` mappa i codici PostgreSQL (`23514`, `23503`, `23502`, `22P02` → `400`) evitando di esporre messaggi interni del DB. Tuttavia manca un error-handling middleware globale in `src/server.js` (per errori di parsing JSON malformato o eccezioni non catturate), sono presenti route duplicate in `src/segnalazioni.js` e lo script `npm test` in `package.json` punta a `tests/*.test.js` invece delle sottocartelle reali. |

---

## 2. Esito Audit Infrastrutturale e Segreti (Voci #4 e #5)

* **File di ambiente e `.gitignore`:**
  * `.env` e `.env.local` sono correttamente esclusi dal tracciamento Git.
  * `config/dev.env` e `config/test.env` sono tracciati per scelta progettuale (documentata in `docs/configuration.md`), ma contengono `POSTGRES_PASSWORD=lab123` e chiavi `JWT_SECRET` fisse. In ambienti condivisi o di staging/produzione occorre assicurarsi che non vengano mai riutilizzati.
* **Container e Kubernetes (`dockerfile`, `docker-compose.yml`, `k8s/`):**
  * Immagine applicativa eseguita senza privilegi di root (`USER node`).
  * `k8s/deployment-backend.yaml` e `k8s/deployment-db.yaml` separano correttamente configurazioni non sensibili (`ConfigMap` `backend-config`) e credenziali (`Secret` `backend-secret`).
  * **Nota configurazione K8s:** `k8s/configmap.yaml`, `k8s/configmap-dev.yaml` e `k8s/configmap-test.yaml` condividono lo stesso `metadata.name: backend-config` senza `namespace` esplicito; applicarli sullo stesso cluster/namespace sovrascrive l'ambiente precedente.
  * **Nota DB K8s:** `k8s/deployment-db.yaml` non monta ancora un `PersistentVolumeClaim` né lo script `db/schema.sql`.
* **Verifica manuale consigliata da terminale (Persona 3 & Persona 4):**
  ```bash
  git log -p -S "password" --all
  git log -p -S "secret" --all
  npm audit --audit-level=moderate
  ```

---

## 3. Criticità Rilevate

### C1 — Credenziali di laboratorio e JWT secret tracciati in `config/dev.env` e `config/test.env`
* **Severità:** Media
* **Ambito:** Infrastruttura & Configurazione (Persona 3 · Voce #4)
* **Dove:** `.gitignore` (righe 8–9), `config/dev.env` (righe 6, 9), `config/test.env` (righe 6, 10)
* **Descrizione:** L'eccezione `!config/dev.env` e `!config/test.env` nel `.gitignore` espone nella repository Git la password del database (`lab123`) e le chiavi `JWT_SECRET` di sviluppo e test. Se un ambiente di pre-produzione usasse quei file senza override, i token JWT potrebbero essere forgiati.
* **Rimedio proposto:** Rimuovere `POSTGRES_PASSWORD` e `JWT_SECRET` dai file tracciati `config/*.env` (o sostituirli con segnaposto) ed esternalizzare i valori sensibili esclusivamente nel file locale `.env` non tracciato e nei `Secret` di Kubernetes.
* **Corretta:** No *(in attesa di commit di fix)*

---

### C2 — Assenza di middleware globale di gestione errori JSON in Express
* **Severità:** Media
* **Ambito:** Backend & API Security (Persona 4 · Voce #3 / #7)
* **Dove:** `src/server.js` (righe 15–49)
* **Descrizione:** `src/server.js` registra `app.use(express.json())` ma non definisce un middleware finale `(err, req, res, next)`. Inviando un payload JSON sintatticamente malformato (es. `{"stato": ` con header `Content-Type: application/json`) o in caso di eccezione imprevista fuori dai blocchi `try/catch`, Express restituisce la risposta HTML predefinita (con dettagli tecnici/stack trace in modalità non-production) invece di un errore JSON pulito (`400 Bad Request` / `500 Internal Server Error`).
* **Rimedio proposto:** Aggiungere in fondo alle rotte di `src/server.js` un error handler centralizzato che intercetti `err instanceof SyntaxError && err.status === 400` restituendo `400 { errore: 'JSON malformato' }` e logghi lato server gli altri errori restituendo `500 { errore: 'Errore interno del server' }`.
* **Corretta:** No *(in attesa di commit di fix)*

---

### C3 — Route duplicate e query con colonna inesistente in `src/segnalazioni.js`
* **Severità:** Media
* **Ambito:** Backend & Manutenibilità (Persona 4 · Voce #3 / #7)
* **Dove:** `src/segnalazioni.js` (righe 420–606, duplicate rispetto alle righe 250–294)
* **Descrizione:** In fondo a `src/segnalazioni.js` sono rimaste due definizioni duplicate di `POST /:id/note` e `GET /:id/note` (residue di un merge/generazione precedente). Sebbene Express esegua le prime dichiarate (righe 250–294), le definizioni duplicate leggono `req.body.id_utente` invece del token JWT e interrogano la colonna inesistente `n.data_creazione` (che causerebbe un errore SQL `42703` / `500` se raggiunte).
* **Rimedio proposto:** Eliminare i blocchi duplicati dalle righe 420–606 di `src/segnalazioni.js`, mantenendo esclusivamente gli endpoint protetti alle righe 250–294.
* **Corretta:** No *(in attesa di commit di fix)*

---

### C4 — Validazione input applicativa incompleta su `POST /segnalazioni` e parametri `:id`
* **Severità:** Bassa / Media
* **Ambito:** Validazione Input (Persona 4 · Voce #3)
* **Dove:** `src/segnalazioni.js` (righe 90–114, 131–149, 152–247)
* **Descrizione:** In `POST /segnalazioni` viene verificata solo la presenza truthy di `titolo` e `id_area` (`if (!titolo || !id_area)`). Valori come `titolo` composto da soli spazi (`"   "`), tipi non stringa (`123` o oggetti JSON), o coordinate/priorità non valide vengono demandati interamente ai vincoli del database PostgreSQL.
* **Rimedio proposto:** Validare esplicitamente tipo e formato di `titolo` (`typeof titolo === 'string' && titolo.trim().length > 0`), `id_area` (intero positivo) e campi opzionali prima di eseguire la `INSERT`.
* **Corretta:** No *(in attesa di commit di fix)*

---

### C5 — CORS aperto (`*`) nei file di ambiente e disallineamento script `npm test`
* **Severità:** Bassa
* **Ambito:** Configurazione & QA (Persona 3 & Persona 4 · Voce #5 / #7)
* **Dove:** `config/dev.env` (riga 7), `config/test.env` (riga 7), `package.json` (riga 12)
* **Descrizione:**
  1. `CORS_ORIGIN=*` è impostato sia in `dev.env` che in `test.env` (e come fallback in `src/server.js`), permettendo richieste cross-origin da qualsiasi dominio.
  2. In `package.json` lo script `"test": "node --test tests/*.test.js"` non trova alcun file perché i test con runner nativo Node si trovano in `tests/unit/*.test.js` e `tests/integration/*.test.js` (mentre `tests/tests/segnalazioni.test.js` usa la sintassi Jest).
* **Rimedio proposto:** Restringere `CORS_ORIGIN` all'origine esplicita del frontend in `test.env` e aggiornare `"test"` in `package.json` a `"node --test tests/unit/*.test.js tests/integration/*.test.js"`.
* **Corretta:** No *(in attesa di commit di fix)*

---

## 4. Riepilogo Cross-Review (Persona 1 e Persona 2)

* **Revisione Persona 1 (`public/app.js`, `public/index.html`):**
  * **Protezione XSS:** L'output dinamico nelle tabelle segnalazioni e utenti utilizza sistematicamente `escapeHtml()`. Non sono stati rilevati vettori XSS diretti nei template HTML generati dal client.
  * **Esposizione dati lato client:** Nessun dato sensibile (`password_hash`) viene esposto al frontend. Il filtro visivo in `caricaSegnalazioni()` rispecchia i permessi UI, ma la sicurezza effettiva è garantita lato server da `filtroVisibilita()`. Si segnala comunque che `localStorage` espone il JWT a eventuali script iniettati.
* **Revisione Persona 2 (Bypass frontend e chiamate dirette API):**
  * **Accesso senza token (`401`):** Tutte le rotte sotto `/segnalazioni` (eccetto `GET /segnalazioni/stati`), `/utenti`, `/squadre` e `/api/auth/me` sono protette da `autentica` e restituiscono `401`.
  * **Accesso con ruoli non autorizzati (`403`):** Le restrizioni RBAC su creazione segnalazioni, cambio stato (`STATI_PER_RUOLO`), assegnazione (`POST /:id/assegna`) e gestione utenti (`/utenti`) sono applicate lato server. Anche passando un `id_utente` arbitrario nel body di `POST /segnalazioni` o `POST /:id/note`, il backend lo ignora e utilizza `req.utente.id` dal token JWT verificato.

---

## 5. Registro Verifiche Pratiche e Test di Regressione

Per chiudere la review dopo l'applicazione dei fix alle criticità (`C1`–`C5`), eseguire i seguenti controlli con il server avviato e aggiornare lo stato **Corretta: Sì** con i relativi hash dei commit:

```bash
# 1. Tentativo accesso senza token -> atteso 401 Unauthorized
curl -i http://localhost:3000/segnalazioni

# 2. Tentativo accesso risorsa admin con ruolo segnalatore -> atteso 403 Forbidden
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"aneri","password":"Password123!"}' | node -e "console.log(JSON.parse(require('fs').readFileSync(0,'utf8')).token)")
curl -i -H "Authorization: Bearer $TOKEN" http://localhost:3000/utenti

# 3. Invio JSON malformato -> atteso 400 Bad Request (risposta JSON, no stack trace)
curl -i -X POST http://localhost:3000/segnalazioni \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"titolo": '

# 4. Esecuzione suite completa dei test Node
node --test tests/unit/*.test.js tests/integration/*.test.js
```

| Criticità | Stato | Commit di riferimento | Esito verifica |
| :--- | :---: | :--- | :--- |
| **C1** (Segreti in `config/*.env`) | Da verificare | `—` | In attesa di fix |
| **C2** (Error handler JSON globale) | Da verificare | `—` | In attesa di fix |
| **C3** (Route note duplicate in `src/segnalazioni.js`) | Da verificare | `—` | In attesa di fix |
| **C4** (Validazione input `POST /segnalazioni`) | Da verificare | `—` | In attesa di fix |
| **C5** (`CORS_ORIGIN` & script `npm test`) | Da verificare | `—` | In attesa di fix |