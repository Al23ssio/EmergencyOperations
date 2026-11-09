# Configurazione e ambienti — Emergency Operations

|  |  |
| :---- | :---- |
| **Progetto** | Emergency Operations — Territorio Sicuro Consorzio |
| **Team** | Team 3 |
| **Autrice** | Sabrina Spaneshi (Troubleshooting & Documentation) |
| **Data** | 09/11/2026 |
| **Versione** | v1.0 |

Il backend è **una sola immagine** (`localhost:32000/emergency-operations-backend:1.0.0`) che gira in DEV e in TEST **senza modificare il codice**: cambia solo la configurazione, iniettata come variabili d'ambiente.

---

## 1. Da dove arrivano le variabili

| Modo di esecuzione | File che fornisce le variabili | Come vengono iniettate |
| :---- | :---- | :---- |
| Kubernetes (MicroK8s) — DEV | `k8s/configmap-dev.yaml` + `k8s/secret-example.yaml` | `envFrom` → `configMapRef` `backend-config` e `secretRef` `backend-secret` nel Deployment |
| Kubernetes (MicroK8s) — TEST | `k8s/configmap-test.yaml` + `k8s/secret-example.yaml` | come sopra |
| Docker Compose | `config/dev.env` oppure `config/test.env` | `env_file`, scelto con la variabile `ENV_FILE` (default `config/dev.env`) |
| Node in locale (`npm start`) | `.env` nella cartella principale | caricato da `dotenv` in `src/db.js`; non sovrascrive variabili già presenti |

Regola: **parametri non sensibili** (porte, host, nomi, flag) stanno nel **ConfigMap**; **credenziali** (`POSTGRES_USER`, `POSTGRES_PASSWORD`) stanno **solo nel Secret** e non vanno mai in un ConfigMap o in un file committato con valori reali.

### Quali file sono nel repository

| File | Nel repository | Perché |
| :---- | :----: | :---- |
| `.env.example` | Sì | Elenco di tutte le variabili con valori di esempio, senza credenziali reali |
| `config/dev.env`, `config/test.env` | Sì (eccezione esplicita in `.gitignore`) | Servono a lanciare DEV e TEST con la stessa immagine; contengono solo la password di laboratorio, non credenziali reali |
| `.env` | **No** (escluso da `.gitignore`) | File locale di ogni sviluppatore |
| `k8s/secret-example.yaml` | Sì, solo con valori segnaposto | Le credenziali vere si creano sul cluster e non si committano |

---

## 2. Tabella delle variabili d'ambiente

### 2.1 Variabili lette dal backend (`src/server.js`, `src/db.js`)

| Variabile | Scopo | Obbligatoria | Default nel codice | DEV | TEST | Dove si imposta |
| :---- | :---- | :----: | :---- | :---- | :---- | :---- |
| `DB_HOST` | Host del database PostgreSQL | **Sì** | — | `postgres-service` | `postgres-service` | ConfigMap |
| `POSTGRES_DB` | Nome del database usato dal backend (e creato dal container `postgres` al primo avvio) | **Sì** | — | `segnalazioni_dev` | `emergency_test` | ConfigMap |
| `POSTGRES_USER` | Utente del database | **Sì** | — | da Secret | da Secret | Secret |
| `POSTGRES_PASSWORD` | Password del database | **Sì** | — | da Secret | da Secret | Secret |
| `DB_PORT` | Porta del database | No | `5432` (default della libreria `pg`) | `5432` | `5432` | ConfigMap |
| `PORT` | Porta HTTP su cui ascolta Express. **Deve coincidere** con `containerPort`, probe e `targetPort` dei manifest (3000) | No | `3000` | `3000` | `3000` | ConfigMap |
| `NODE_ENV` | Nome dell'ambiente; mostrato nella risposta di `GET /health` | No | `development` | `development` | `test` | ConfigMap |
| `CORS_ORIGIN` | Valore dell'header `Access-Control-Allow-Origin` | No | `*` | `http://localhost:3000` | `https://test.emergencyoperations.it` | ConfigMap |
| `LOG_LEVEL` | Livello di log previsto | No | — (**non ancora letta dal codice**) | `debug` | `info` | ConfigMap |

**Obbligatoria** = controllata all'avvio in `src/server.js` (`REQUIRED_ENV`). Se manca, il processo stampa su stderr `[ERRORE CRITICO] Configurazione mancante: …` ed esce con **codice 1** (fail-fast). Se il database non risponde all'avvio, esce con codice 1 e il messaggio `Impossibile connettersi al database`.

### 2.2 Variabili usate solo da strumenti e test

| Variabile | Usata da | Scopo | Default |
| :---- | :---- | :---- | :---- |
| `ENV_FILE` | `docker-compose.yml` | Sceglie quale file di ambiente iniettare | `config/dev.env` |
| `TEST_URL` | `tests/segnalazioni.test.js` (`npm test`) | Indirizzo del backend da testare | `http://localhost:3000` |
| `BASE_URL` | `tests/e2e-multi-env.js` | Indirizzo del backend per il test end-to-end | `http://localhost:${PORT}` |

### 2.3 Variabili lette dal container `postgres:16`

Il Deployment del database riceve lo stesso ConfigMap e lo stesso Secret: l'immagine ufficiale usa `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` per creare utente e database **al primo avvio** (solo con volume vuoto).

---

## 3. Guasto diagnosticato nell'ambiente TEST

Metodo in 5 fasi: **Sintomo → Ipotesi → Verifica → Causa → Correzione**.
Comandi eseguiti su MicroK8s (`microk8s kubectl …`, abbreviato `kubectl`).

### 3.1 Sintomo

Dopo `kubectl apply -f k8s/configmap-test.yaml` e il riavvio del backend, in TEST l'applicazione **non risponde**, mentre in DEV, con la **stessa immagine**, funziona.

```
kubectl get pods
NAME                       READY   STATUS    RESTARTS
backend-xxxxxxxxxx-xxxxx   0/1     Running   4
```

I pod del backend restano **0/1 (non Ready)** e il contatore `RESTARTS` cresce. Il Service `emergency-ops-backend` non ha endpoint, quindi `curl` e il browser ricevono un errore.

### 3.2 Ipotesi

| # | Ipotesi | Perché è plausibile |
| :---: | :---- | :---- |
| H1 | Il backend non si collega al database (host, nome DB o credenziali errati) | In TEST cambiano `POSTGRES_DB` e il ConfigMap |
| H2 | Manca una variabile obbligatoria e il processo esce subito (fail-fast) | Il codice esce con codice 1 se manca una variabile |
| H3 | Il backend ascolta su una porta diversa da quella attesa da probe e Service | È l'unico valore "di rete" che cambia tra DEV e TEST |
| H4 | Errore CORS | `CORS_ORIGIN` è diverso in TEST |

### 3.3 Verifica

**1. Log del container**
```
kubectl logs deploy/backend
Database connesso
Server avviato sulla porta 8080
```
→ Il database è raggiungibile e non manca nessuna variabile: **H1 e H2 scartate**. Il server però parte sulla porta **8080**.

**2. Eventi del pod**
```
kubectl describe pod -l app=backend
Warning  Unhealthy  Readiness probe failed: Get "http://<ip-pod>:3000/health": dial tcp <ip-pod>:3000: connect: connection refused
Warning  Unhealthy  Liveness probe failed:  Get "http://<ip-pod>:3000/health": dial tcp <ip-pod>:3000: connect: connection refused
Normal   Killing    Container backend failed liveness probe, will be restarted
```
→ Kubernetes controlla `/health` sulla porta **3000**, ma lì non ascolta nessuno: il pod non diventa mai Ready e viene riavviato di continuo.

**3. Variabili realmente iniettate**
```
kubectl exec deploy/backend -- env | grep -E "PORT|NODE_ENV"
PORT=8080
DB_PORT=5432
NODE_ENV=test
```

**4. Prova di rete**
```
kubectl port-forward deploy/backend 8080:8080
curl http://localhost:8080/health
{"server":"ok","database":"ok","environment":"test",...}
```
→ Sulla porta 8080 il backend risponde correttamente: l'applicazione è sana, è sbagliata solo la porta. **H3 confermata**. H4 è scartata: il problema si presenta prima di qualsiasi richiesta dal browser, e il frontend è servito dalla stessa origine del backend.

### 3.4 Causa

In `k8s/configmap-test.yaml` c'era **`PORT: "8080"`**, mentre `k8s/deployment-backend.yaml` (`containerPort`, `livenessProbe`, `readinessProbe`) e `k8s/service-backend.yaml` (`targetPort`) usano **3000**. Il manifest è lo stesso per i due ambienti, quindi l'unico valore discordante è nel ConfigMap di TEST.

Si tratta di un **errore di configurazione, non di codice**: l'immagine è identica a quella di DEV, che funziona.

### 3.5 Correzione

1. In `k8s/configmap-test.yaml`: `PORT: "8080"` → **`PORT: "3000"`**.
2. Applicare la modifica e riavviare i pod, perché le variabili d'ambiente vengono lette solo all'avvio del container:
   ```
   kubectl apply -f k8s/configmap-test.yaml
   kubectl rollout restart deployment/backend
   ```
3. Verifica dopo la correzione:
   ```
   kubectl get pods                 → backend 1/1 Running, RESTARTS stabili
   kubectl logs deploy/backend      → Server avviato sulla porta 3000
   curl http://emergency-operations.local/health → {"server":"ok","database":"ok","environment":"test",...}
   ```

**Come evitarlo in futuro:** `PORT` è un valore **interno al container**. Per esporre TEST su un'altra porta o su un altro indirizzo si cambia il Service o l'Ingress, non la porta dell'applicazione. Così `containerPort`, probe e `targetPort` restano sempre allineati a 3000.

---

## 4. Altri punti emersi dalla revisione della configurazione

Non bloccano TEST su Kubernetes, ma vanno sistemati:

| # | Dove | Problema | Proposta |
| :---: | :---- | :---- | :---- |
| 1 | `config/dev.env`, `config/test.env` | I due file sono uguali tranne `NODE_ENV`: stesso `DB_HOST`, stesso `POSTGRES_DB`, stesso `CORS_ORIGIN`. Con Docker Compose, TEST scrive nello stesso database di DEV | Differenziare almeno `POSTGRES_DB` e `CORS_ORIGIN`, come già fatto nei ConfigMap |
| 2 | `config/dev.env` con `docker compose` | `DB_HOST=localhost`: dentro il container `backend` "localhost" è il container stesso, non il database | Con Compose usare `DB_HOST=db` (nome del servizio) |
| 3 | `config/*.env` + `.gitignore` | I file sono esclusi dall'ignore ma contengono una password (`lab123`) | Lasciare nei file solo valori non sensibili e passare le credenziali da `.env` o Secret |
| 4 | `k8s/configmap*.yaml` | Tre ConfigMap con lo stesso nome `backend-config`: l'ultimo applicato sovrascrive gli altri, quindi DEV e TEST non possono convivere | Usare due namespace (`dev`, `test`) e applicare ciascun ConfigMap nel proprio |
| 5 | `k8s/deployment-db.yaml` | Nessun volume e nessuno schema caricato: le tabelle non esistono e i dati si perdono al riavvio del pod | Montare `db/schema.sql` da un ConfigMap in `/docker-entrypoint-initdb.d` e aggiungere un PersistentVolumeClaim |
| 6 | `LOG_LEVEL` | Dichiarata nei ConfigMap ma mai letta dal codice | Usarla nel logging o toglierla dai file |
