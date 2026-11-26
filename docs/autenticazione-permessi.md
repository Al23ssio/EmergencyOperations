# Autenticazione e permessi (JWT + RBAC)

|  |  |
| :---- | :---- |
| **Redazione** | Sabrina Spaneshi |
| **Data** | 25/11/2026 |
| **Versione** | v1.0 |

Il login fittizio, cioè i 2 utenti scritti a mano in `src/auth.js`, è stato sostituito da un login vero collegato al database. Le rotte sono protette con token JWT e ogni operazione è permessa solo ai ruoli previsti dal cliente.

## 1. Come funziona

1. Il client invia `POST /api/auth/login` con `{ "username": "...", "password": "..." }`. Al posto dello username si può usare anche l'email.
2. Il backend cerca l'utente nella tabella `utente` e controlla che sia `attivo`. Poi confronta la password con `password_hash` tramite **bcrypt**: la password non è mai salvata in chiaro.
3. Se la verifica fallisce (utente inesistente, disattivato o password sbagliata) la risposta è sempre **401 "Credenziali non valide"**. Il messaggio è generico apposta, così non dà indizi a chi prova a indovinare.
4. Se va tutto bene, il backend restituisce un **token JWT** firmato con `JWT_SECRET` (dal file `.env`), con scadenza `JWT_EXPIRES_IN` (default `24h`). Nel token ci sono solo `id`, `email` e `ruolo`.
5. Per le rotte protette il client invia l'header `Authorization: Bearer <token>`.
   - Il middleware `autentica` (`src/middleware/auth.js`) verifica firma e scadenza. Se il token manca o non è valido risponde **401 Unauthorized**.
   - Il middleware `autorizza(...ruoli)` controlla il ruolo. Se il ruolo non è ammesso risponde **403 Forbidden**.

L'autore di una segnalazione, nota, assegnazione o modifica viene preso **dal token** e non più dal campo `id_utente` del body, così nessuno può fingersi un altro utente.

## 2. Matrice dei permessi

| Endpoint | Segnalatore | Operatore di centrale | Squadra | Responsabile | Amministratore |
|---|:-:|:-:|:-:|:-:|:-:|
| `POST /segnalazioni` (crea) | ✓ | ✓ | – | – | ✓ |
| `GET /segnalazioni` (consulta) | ✓ solo le proprie | ✓ | ✓ solo le assegnate | ✓ | ✓ |
| `PATCH /segnalazioni/:id/stato` | – | ✓ valutata, assegnata, chiusa | ✓ in_intervento, risolta (solo se assegnata) | – | ✓ |
| `POST /segnalazioni/:id/assegna` | – | ✓ | – | – | ✓ |
| `POST /segnalazioni/:id/note` | ✓ | ✓ | ✓ | ✓ | ✓ |
| `GET /utenti`, `POST /utenti` | – | – | – | – | ✓ |

Le regole della macchina a stati restano valide per tutti, compreso l'amministratore. Per esempio `ricevuta → chiusa` dà sempre 400.

I nomi dei ruoli nel database sono `segnalatore`, `operatore_centrale`, `squadra`, `responsabile` e `amministratore` (tabella `ruolo`).

## 3. Utenti di prova

Sono creati da `db/schema.sql`. La password è **`Password123!`** per tutti.

| Username | Ruolo |
|---|---|
| `aneri` | segnalatore |
| `mrossi` | operatore_centrale |
| `lbianchi` | squadra (Squadra Nord) |
| `gverdi` | squadra (Squadra Centro) |
| `pgialli` | responsabile |
| `admin` | amministratore |

## 4. Come provarlo

1. Installa le nuove librerie con `npm install`. Servono `bcryptjs` per gli hash e `jsonwebtoken` per i token.
2. Aggiungi `JWT_SECRET` al tuo `.env`, come mostrato in `.env.example`. Senza questa variabile il server **non parte**, di proposito.
3. Ricrea il database, perché lo schema è cambiato:
   ```
   docker compose down -v
   docker compose up -d
   ```
4. Esegui le richieste di `prove.http` partendo dalla **0. LOGIN**, oppure apri il frontend e fai login con un utente della tabella.
5. Lancia i test automatici (con il backend avviato):
   ```
   node --test tests/integration/auth-rbac.test.js
   ```
   I 20 test controllano login, 401 e 403 per ogni ruolo.

Per Kubernetes, `JWT_SECRET` va nel Secret (vedi `k8s/secret-example.yaml`).
