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

**Ambiente della prova:** cluster Kubernetes locale a un nodo (Docker Desktop, kubeadm, Kubernetes v1.34.1), con la stessa immagine `localhost:32000/emergency-operations-backend:1.0.0` e gli stessi manifest di `k8s/`. Su MicroK8s i comandi sono gli stessi, preceduti da `microk8s` (`microk8s kubectl …`).

**Avvio di TEST con la configurazione che conteneva il guasto** (il ConfigMap di TEST com'era su `main`):
```
git show main:k8s/configmap-test.yaml | kubectl apply -f -
kubectl apply -f k8s/secret-example.yaml -f k8s/service-db.yaml -f k8s/deployment-db.yaml
kubectl apply -f k8s/service-backend.yaml -f k8s/deployment-backend.yaml
```

### 3.1 Sintomo

Il database parte, ma i pod del backend **non diventano mai pronti** (0/1) e vengono riavviati di continuo:

```
kubectl get pods
NAME                       READY   STATUS    RESTARTS      AGE
backend-5bc9b8c68-4jtmn    0/1     Running   2 (60s ago)   3m21s
backend-5bc9b8c68-d4fmk    0/1     Running   2 (60s ago)   3m21s
db-b7c68d8d-lkhvg          1/1     Running   0             4m3s
```

Poiché nessun pod è Ready, il Service `emergency-ops-backend` non ha endpoint a cui inoltrare le richieste: l'applicazione in TEST non risponde.

### 3.2 Ipotesi

| # | Ipotesi | Perché è plausibile |
| :---: | :---- | :---- |
| H1 | Il backend non si collega al database (host, nome DB o credenziali errati) | In TEST cambiano `POSTGRES_DB` e il ConfigMap |
| H2 | Manca una variabile obbligatoria e il processo esce subito (fail-fast) | Il codice esce con codice 1 se manca una variabile |
| H3 | Il backend ascolta su una porta diversa da quella attesa da probe e Service | È un valore che cambia tra DEV e TEST |
| H4 | Errore CORS | `CORS_ORIGIN` è diverso in TEST |

### 3.3 Verifica

**1. Log del container**
```
kubectl logs deploy/backend
Found 2 pods, using pod/backend-5bc9b8c68-4jtmn
Database connesso
Server avviato sulla porta 8080
```
→ Il database è raggiungibile e non manca nessuna variabile: **H1 e H2 scartate**. Il server però parte sulla porta **8080**.

**2. Eventi del pod** (`kubectl describe pod -l app=backend`, sezione Events)
```
Normal   Pulled     Container image "localhost:32000/emergency-operations-backend:1.0.0" already present on machine
Normal   Started    Started container backend
Warning  Unhealthy  Liveness probe failed: Get "http://10.1.0.7:3000/health": dial tcp 10.1.0.7:3000: connect: connection refused
Normal   Killing    Container backend failed liveness probe, will be restarted
Warning  Unhealthy  (x11 over 48s) Readiness probe failed: Get "http://10.1.0.7:3000/health": dial tcp 10.1.0.7:3000: connect: connection refused
```
→ Kubernetes controlla `/health` sulla porta **3000**, ma su quella porta non ascolta nessuno: la readiness probe fallisce (il pod non è Ready) e la liveness probe fallisce (il container viene riavviato).

**3. Variabili realmente iniettate** (estratto; la password del Secret è omessa)
```
kubectl exec deploy/backend -- env
PORT=8080
DB_HOST=postgres-service
DB_PORT=5432
POSTGRES_DB=emergency_test
NODE_ENV=test
CORS_ORIGIN=https://test.emergencyoperations.it
EMERGENCY_OPS_BACKEND_SERVICE_PORT=3000
```
→ Il container riceve **`PORT=8080`**, mentre il Service del backend espone la **3000**. Le variabili del database sono corrette.

→ **H3 confermata.** H4 è scartata: il problema si presenta prima di qualsiasi richiesta dal browser, e il frontend è servito dalla stessa origine del backend.

### 3.4 Causa

In `k8s/configmap-test.yaml` c'era **`PORT: "8080"`**, mentre `k8s/deployment-backend.yaml` (`containerPort`, `livenessProbe`, `readinessProbe`) e `k8s/service-backend.yaml` (`targetPort`) usano **3000**. Il backend legge `PORT` all'avvio e si mette in ascolto sulla 8080, dove Kubernetes non lo cerca.

È un **errore di configurazione, non di codice**: l'immagine è identica a quella di DEV, che funziona.

### 3.5 Correzione

1. In `k8s/configmap-test.yaml`: `PORT: "8080"` → **`PORT: "3000"`**.
2. Applicazione della modifica e riavvio dei pod, perché le variabili d'ambiente vengono lette solo all'avvio del container:
   ```
   kubectl apply -f k8s/configmap-test.yaml
   configmap/backend-config configured

   kubectl rollout restart deployment/backend
   deployment.apps/backend restarted
   ```
3. Verifica dopo la correzione:
   ```
   kubectl logs deploy/backend
   Database connesso
   Server avviato sulla porta 3000

   kubectl get pods
   NAME                        READY   STATUS    RESTARTS   AGE
   backend-555f8fcb9d-8d42w    1/1     Running   0          2m10s
   backend-555f8fcb9d-f8fks    1/1     Running   0          2m1s
   db-b7c68d8d-lkhvg           1/1     Running   0          6m6s

   kubectl port-forward svc/emergency-ops-backend 3000:3000      (in un secondo terminale)
   curl.exe http://localhost:3000/health
   {"server":"ok","database":"ok","environment":"test","corsOrigin":"https://test.emergencyoperations.it"}
   ```
   → I pod nuovi sono **Ready (1/1)** con **0 riavvii**, e la chiamata reale attraverso il Service raggiunge backend e database in ambiente **test**. Guasto risolto.

**Come evitarlo in futuro:** `PORT` è un valore **interno al container**. Per esporre TEST su un'altra porta o su un altro indirizzo si cambia il Service o l'Ingress, non la porta dell'applicazione. Così `containerPort`, probe e `targetPort` restano sempre allineati a 3000.

**Nota di sicurezza:** `kubectl exec … env` mostra anche i valori del Secret in chiaro. Negli screenshot o nei report vanno mostrate solo le variabili utili alla diagnosi.

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
