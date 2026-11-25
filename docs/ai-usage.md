# Uso dell'AI nello sviluppo — Emergency Operations

|  |  |
| :---- | :---- |
| **Progetto** | Emergency Operations — Territorio Sicuro Consorzio |
| **Team** | Team 3 |
| **Redazione** | Sabrina Spaneshi (Debugger & Documentation Lead) |
| **Contributi** | Carmen Nuvoli (Prompt & Feature), Alessio Innocenti (AI Code Auditor), Gabriel Ignat (AI Test Engineer) |
| **Data** | 25/11/2026 |
| **Versione** | v1.0 |

**Regola del team:** nessun output dell'AI entra nel codice senza essere stato **eseguito e verificato**: chiamata reale all'API, test automatico o query sul database PostgreSQL con lo schema del progetto (`db/schema.sql`). Ciò che non si riesce a verificare non si tiene.

## Riepilogo

| # | Caso | Chi | L'AI ha… | Cosa si è tenuto |
| :---: | :---- | :---- | :---- | :---- |
| 1 | Generazione degli endpoint delle note | Carmen | **aiutato in parte, ma ha sbagliato una colonna** | Validazione, controllo 404, JOIN su `nome_cognome`; **scartata** la colonna `data_creazione` |
| 2 | Generazione dei test per la nuova feature | Ignat | **aiutato** | 6 test tenuti, 3 scartati con motivazione |
| 3 | Refactoring degli endpoint delle note | Alessio | **sbagliato** | Niente: mantenuto il codice originale |
| 4 | Debug assistito: errore 500 su `PATCH /segnalazioni/:id/stato` | Sabrina | **aiutato** | Diagnosi della causa; correzione della query sullo storico |
| 5 | Debug assistito: guasto nell'ambiente TEST su Kubernetes | Sabrina | **aiutato** | Metodo di diagnosi in 5 fasi; correzione di `PORT` nel ConfigMap |

---

## Caso 1 — Generazione degli endpoint delle note (Carmen)

**Dove:** `POST /segnalazioni/:id/note` e `GET /segnalazioni/:id/note` in `src/segnalazioni.js`.

**Chiesto (prompt):**
> Agisci come Senior Backend Developer Express/PostgreSQL. Implementa gli endpoint Express.js per la gestione delle note di una segnalazione (usando `pg.Pool`).
> 1. `POST /segnalazioni/:id/note` — body `{ "id_utente": 1, "testo": "Nota di controllo" }`; 400 se `id_utente` o `testo` mancano; 404 se la segnalazione non esiste; inserimento nella tabella `nota` (`id_segnalazione`, `id_utente`, `testo`), `id_utente` obbligatorio; risposta 201 con il record.
> 2. `GET /segnalazioni/:id/note` — JOIN tra `nota` e `utente`; **la tabella `utente` usa la colonna `nome_cognome` (non `nome` o `cognome`)**; lista ordinata per data decrescente con i campi `id`, `testo`, `data_creazione`, `id_utente`, `autore`.

Nel prompt i vincoli dello schema sono stati scritti apposta: la versione precedente degli endpoint usava colonne inesistenti (`u.nome`, `u.cognome`, `data_ora`).

**Ottenuto:** due endpoint completi, con validazione esplicita (`id_utente === undefined || null`, `String(testo).trim() === ''`), verifica dell'esistenza della segnalazione e JOIN corretta su `u.nome_cognome`.

**Dove l'AI ha sbagliato:** nella `GET` ha usato **`n.data_creazione` come colonna del database**, mentre nel prompt era solo il **nome del campo** da restituire. Nella tabella `nota` la colonna si chiama `creata_il`.

**Verificato:** la query generata, eseguita su PostgreSQL con `db/schema.sql`, fallisce:
```
SELECT n.id, n.testo, n.data_creazione, n.id_utente, u.nome_cognome AS autore
FROM nota n INNER JOIN utente u ON n.id_utente = u.id
WHERE n.id_segnalazione = 1 ORDER BY n.data_creazione DESC;

ERROR:  column n.data_creazione does not exist
```
La query attiva nel router, con `creata_il`, restituisce invece la nota con l'autore (`Mario Rossi`).

**Esito:** **tenuto in parte.** Nell'endpoint attivo sono presenti le parti utili dell'output: la validazione obbligatoria di `id_utente` (400), il controllo di esistenza della segnalazione (404) e la JOIN su `nome_cognome`. La colonna `data_creazione` è stata **scartata**: l'endpoint attivo usa `n.creata_il`.

**Cosa abbiamo imparato:** l'AI confonde il nome di un campo della risposta con il nome di una colonna del database. Per questo ogni query generata va eseguita sullo schema reale prima di entrare nel codice.

---

## Caso 2 — Generazione dei test per la nuova feature (Ignat)

**Dove:** `tests/segnalazioni.test.js`. Il report completo è in `docs/e2e-test-report.md`, sezione "Report di Test API – Segnalazioni (Passo 4)".

**Chiesto:** una suite di test per gli endpoint delle segnalazioni, con happy path, casi limite e casi di errore.

**Ottenuto:** una suite scritta con **Jest + Supertest**, con il database simulato (`jest.mock('../src/db')`), più alcune proposte di test aggiuntivi.

**Test tenuti (6):**

| Test | Categoria | Perché è stato tenuto |
| :---- | :---- | :---- |
| Creazione segnalazione valida (HTTP 201) | Happy path | Verifica l'inserimento con i dati obbligatori |
| Recupero lista segnalazioni (HTTP 200) | Happy path | Conferma che la lettura restituisca un array |
| Avanzamento stato valido (`ricevuta → valutata`) | Happy path | Verifica che la macchina a stati accetti le transizioni consentite |
| Creazione senza campi obbligatori (HTTP 400) | Caso negativo | L'API deve restituire un errore strutturato se il body è incompleto |
| Transizione di stato non consentita (HTTP 400) | Caso negativo | Impedisce salti di stato anomali (es. `ricevuta → risolta`) |
| Ricerca segnalazione inesistente (HTTP 404) | Edge case | Evita errori 500 su risorse non presenti |

**Test scartati (3):**

| Test proposto dall'AI | Perché è stato scartato |
| :---- | :---- |
| SQL injection nei parametri | Ridondante a questo livello: tutte le query usano parametri posizionali (`$1, $2`) del driver `pg` |
| Test di carico (es. 10.000 richieste/secondo) | Fuori scopo per un test di integrazione; richiederebbe strumenti esterni (k6, JMeter) |
| Autenticazione / autorizzazione | Il login non è ancora implementato: `id_utente` arriva dal body (limite noto, segnato con `TODO`) |

**Esito:** **l'AI ha aiutato** a proporre una suite completa e a ragionare su cosa scartare.

**Nota aperta:** l'AI ha scelto **Jest**, mentre il resto del progetto usa il test runner di Node (`node --test`, script `npm test` in `package.json`), e ha simulato il database, mentre negli integration test il team usa PostgreSQL reale. Le due impostazioni vanno allineate.

---

## Caso 3 — Refactoring degli endpoint delle note (Alessio)

**Dove:** `POST /segnalazioni/:id/note` e `GET /segnalazioni/:id/note`.

**Chiesto:** "Proponi un refactoring degli endpoint POST e GET per la gestione delle note, per ottimizzare e pulire il codice esistente."

**Ottenuto:** una versione più compatta. L'AI ha semplificato la validazione (`!id_utente` e `testo.trim() === ''`), ha sostituito i blocchi `res.status(500).json(...)` con chiamate a `next(error)` per delegare la gestione degli errori, e ha aggiunto commenti speculativi sulle tabelle del database.

**Verificato:**
- `POST` con un payload malformato (`"testo": 123`, numerico) → **crash** dell'applicazione per `TypeError: testo.trim is not a function`;
- `POST` con `id_utente: 0` → errore 400: lo `0`, essendo *falsy*, viene bloccato da `!id_utente`, impedendo logiche potenzialmente legittime;
- fallimento forzato della query SQL → errore 500 con la **pagina HTML** di default di Express, che viola il formato JSON atteso dal frontend.

**Esito:** **scartato**, mantenuto il codice originale.

**Perché:** l'AI ha sacrificato la solidità per la brevità. Togliendo il casting `String(testo)` ha introdotto un crash su tipi non previsti; usando `next(error)` ha dato per scontato un middleware globale di gestione degli errori **che nel progetto non esiste**, rompendo il contratto REST (risposte non JSON). Il codice originale, anche se più lungo, gestisce le eccezioni internamente e non va in crash.

---

## Caso 4 — Debug assistito: errore 500 su `PATCH /segnalazioni/:id/stato` (Sabrina)

### Sintomo
Dopo l'aggiunta dello storico delle modifiche, **ogni** cambio di stato (`PATCH /segnalazioni/:id/stato`) rispondeva **500 Internal Server Error**, anche per transizioni ammesse come `ricevuta → valutata`, che prima funzionavano. Fallivano anche il test delle transizioni e il passo 5 di `tests/e2e-multi-env.js`.

### Cosa è stato fornito all'AI
Il router `src/segnalazioni.js`, lo schema `db/schema.sql` e il sintomo (500 su tutte le PATCH).

### Ipotesi proposte dall'AI e verifica di ciascuna

Ogni ipotesi è stata verificata eseguendo le query su PostgreSQL 16 con `db/schema.sql`, **prima** di applicare la correzione.

| # | Ipotesi | Verifica | Esito |
| :---: | :---- | :---- | :---- |
| H1 | La `UPDATE` dello stato è sbagliata (tipi o cast di `$1`) | Eseguita la `UPDATE … SET stato = $1::varchar … RETURNING *` → `UPDATE 1`, stato aggiornato | **Scartata** |
| H2 | L'`INSERT` nello storico usa colonne che non esistono | Eseguito l'`INSERT` del router → `ERROR: column "stato_precedente" of relation "storico_modifica" does not exist`. Le colonne reali sono `tipo_evento`, `campo`, `valore_precedente`, `valore_nuovo`, `"timestamp"`, `id_utente`, `id_segnalazione` | **Confermata** |
| H3 | L'errore dello storico annulla anche il cambio di stato, perché sono nella stessa transazione | Eseguiti `BEGIN` → `UPDATE` (ok) → `INSERT` errato → `COMMIT` → PostgreSQL risponde `ROLLBACK` e lo stato **non cambia** | **Confermata**: spiega perché fallisce anche una transizione valida |
| H4 | Perché proprio 500 e non 400 | `gestisciErrore` mappa solo i codici `23514`, `23503`, `23502`, `22P02`; l'errore "colonna inesistente" (`42703`) finisce nel ramo 500 | **Confermata** |

**Causa:** la query di inserimento nello storico usava colonne inventate (`stato_precedente`, `stato_nuovo`, `note`) non presenti in `storico_modifica`. Lo stesso errore era presente anche in `POST /:id/assegna` (`id_utente_assegnato`) e in `GET /:id/note` e `GET /:id/storico` (`u.nome`, `u.cognome`, `data_ora`).

### Correzione
L'`INSERT` è stato riscritto sulle colonne reali (correzione applicata nel router e documentata in `bug-report-01.md`):
```
INSERT INTO storico_modifica (tipo_evento, campo, valore_precedente, valore_nuovo, id_segnalazione, id_utente)
VALUES ('cambio_stato', 'stato', $1, $2, $3, $4)
```
**Verifica dopo la correzione:** la stessa query eseguita sullo schema risponde `INSERT 0 1`. È stato aggiunto il test di regressione `tests/integration/test-bug-stato.test.js`, che fallisce con il codice vecchio (500) e passa con quello corretto.

**Esito:** **l'AI ha aiutato** a restringere rapidamente le ipotesi, ma la causa è stata accettata solo dopo averla riprodotta sul database reale. In particolare l'ipotesi H1 (il cast `$1::varchar`) sembrava plausibile, ma la prova l'ha esclusa.

---

## Caso 5 — Debug assistito: guasto nell'ambiente TEST su Kubernetes (Sabrina)

**Sintomo:** in TEST i pod del backend restavano `0/1` (non Ready) e venivano riavviati di continuo, mentre in DEV la **stessa immagine** funzionava.

**Log forniti all'AI:** output reali di `kubectl get pods`, `kubectl logs deploy/backend`, `kubectl describe pod -l app=backend` (sezione Events) e `kubectl exec deploy/backend -- env`.

**Ipotesi proposte dall'AI e verifica:**

| # | Ipotesi | Verifica con i log | Esito |
| :---: | :---- | :---- | :---- |
| H1 | Backend non collegato al database | `kubectl logs` → `Database connesso` | Scartata |
| H2 | Variabile obbligatoria mancante (fail-fast) | Il processo resta acceso e il server parte | Scartata |
| H3 | Porta del backend diversa da quella delle probe | `Server avviato sulla porta 8080`; Events: `Liveness probe failed: … :3000 … connection refused`; `env` → `PORT=8080` | **Confermata** |
| H4 | Errore CORS | Il guasto avviene prima di qualsiasi richiesta dal browser | Scartata |

**Correzione:** `PORT: "8080"` → `"3000"` in `k8s/configmap-test.yaml`, poi `kubectl apply` e `kubectl rollout restart deployment/backend`. Verifica: pod `1/1 Running` con 0 riavvii; `curl /health` → `{"server":"ok","database":"ok","environment":"test",…}`.

**Esito:** **l'AI ha aiutato.** Un dettaglio importante: la prima bozza della diagnosi scritta con l'AI conteneva output **previsti**, non osservati. È stata accettata solo dopo aver eseguito davvero i comandi nel cluster e aver sostituito gli output con quelli reali. Dettaglio completo in `docs/configuration.md`, sezione 3.

---

## Cosa abbiamo imparato

- **Dare all'AI i vincoli dello schema** (nomi esatti delle colonne) riduce gli errori, ma non li elimina: nel Caso 1 l'AI ha comunque inventato una colonna.
- **Codice più corto non vuol dire codice migliore**: nel Caso 3 la versione "pulita" introduceva un crash e rompeva il formato JSON.
- **Un'ipotesi dell'AI non è una diagnosi**: nei Casi 4 e 5 ogni ipotesi è stata confermata o scartata con una prova (query sul database, log, `curl`) prima di correggere.
- **Mai riportare come reale un output non osservato**: i risultati nei documenti devono venire da comandi eseguiti davvero.
