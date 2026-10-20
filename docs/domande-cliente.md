# Domande al Cliente – Territorio Sicuro Consorzio
**Progetto:** Emergency Operations - Piattaforma per la gestione delle segnalazioni sul territorio  
**Obiettivo del documento:** Chiarire le ambiguità emerse dall'analisi della richiesta cliente per consolidare i requisiti funzionali, non funzionali e i vincoli operativi prima delle fasi successive di sviluppo.

---

## 1. Gestione Allegati e Fotografie
La richiesta prevede l'inserimento di fotografie sia in fase di registrazione della segnalazione sia durante gli aggiornamenti da parte delle squadre sul territorio.
* **Q1.1 - Formati e limiti di dimensione:** Quali sono i formati immagine ammessi (es. solo `.jpg`, `.png`, `.webp` o anche documenti `.pdf`) e qual è la dimensione massima consentita per singolo file e per singola segnalazione (es. max 5 MB per foto, max 5 foto per intervento)?
* **Q1.2 - Visibilità e permessi:** Le fotografie caricate dalle squadre operative durante l'intervento sono visibili anche al segnalatore/front-office o sono riservate esclusivamente agli operatori di centrale e ai responsabili?
* **Q1.3 - Conservazione (Storage):** È accettabile per l'MVP salvare i file sul filesystem locale del server (o container Docker) referenziando il percorso nel database, oppure disponete già di un servizio di Object Storage esterno (es. AWS S3, MinIO)?

---

## 2. Localizzazione, Aree e Simulazione Coordinate
Il documento indica che la localizzazione può avvenire tramite indirizzo o coordinate (che potranno essere simulate) e prevede filtri per "area".
* **Q2.1 - Obbligatorietà indirizzo vs coordinate:** In fase di creazione di una segnalazione, l'operatore deve inserire obbligatoriamente sia l'indirizzo testuale sia le coordinate (latitudine/longitudine), oppure basta uno solo dei due dati?
* **Q2.2 - Logica di simulazione delle coordinate:** Quando viene inserito solo un indirizzo testuale, il sistema deve generare automaticamente coordinate simulate plausibili all'interno del perimetro comunale, oppure l'utente le inserisce/seleziona manualmente da una lista predefinita?
* **Q2.3 - Associazione all'Area territoriale:** L'area di competenza (es. *Centro*, *Zona Nord*, o specifico Comune) viene selezionata manualmente dall'operatore tramite menu a tendina o deve essere dedotta in automatico in base all'indirizzo/coordinate?

---

## 3. Ciclo di Vita della Segnalazione e Macchina a Stati
Gli stati previsti sono: `ricevuta`, `valutata`, `assegnata`, `in_intervento`, `risolta`, `chiusa`.
* **Q3.1 - Sequenzialità e rollback degli stati:** Il flusso degli stati deve essere strettamente sequenziale o sono ammessi ritorni a stati precedenti? *(Esempio: una segnalazione `assegnata` può tornare a `valutata` se la squadra rifiuta o ha un imprevisto? Una segnalazione `risolta` può tornare `in_intervento` se il controllo finale non supera la verifica?)*
* **Q3.2 - Annullamento o segnalazioni duplicate:** Come devono essere gestite le segnalazioni errate, i falsi allarmi o i duplicati? Possono passare direttamente dallo stato `ricevuta`/`valutata` allo stato `chiusa` (motivando con una nota obbligatoria), oppure serve uno stato dedicato (es. `annullata` / `duplicata`)?
* **Q3.3 - Assegnazione multi-squadra:** Una singola segnalazione critica (es. vasto allagamento) può essere assegnata a più squadre contemporaneamente o vale il vincolo di una sola squadra attiva alla volta per segnalazione?

---

## 4. Regole per le Notifiche e Predisposizioni Future
Il punto 8 cita la *"predisposizione futura a servizi cartografici, notifiche e integrazioni"*.
* **Q4.1 - Eventi scatenanti (Trigger):** Quali eventi dovranno generare una notifica (es. creazione di una segnalazione ad `alta` priorità, assegnazione di un intervento a una squadra, cambio di stato in `risolta`)?
* **Q4.2 - Modalità di simulazione nell'MVP:** Poiché non è richiesta una vera integrazione con servizi esterni, per la dimostrazione del prototipo è sufficiente simulare l'invio delle notifiche tramite log strutturati a console/database o badge visivi nell'interfaccia web?

---

## 5. Supporto Intelligenza Artificiale (Classificazione e Priorità)
Il punto 10 richiede un supporto AI che suggerisca categoria e priorità in base alla descrizione, sempre validato dall'operatore.
* **Q5.1 - Comportamento in caso di indisponibilità dell'AI:** In ottica di resilienza (Requisito 6), se il modulo/servizio AI non risponde o impiega troppo tempo, confermate che l'operatore può procedere normalmente con l'inserimento manuale di categoria e priorità senza blocchi operativi?
* **Q5.2 - Tracciamento del rifiuto:** Quando l'operatore modifica o rifiuta la proposta generata dall'AI, è sufficiente salvare il flag `accettato = false` nello storico dei suggerimenti AI o è richiesta anche una motivazione testuale?

---

## 6. Sicurezza, Ruoli e Visibilità
* **Q6.1 - Segnalatore esterno vs Operatore Front-Office:** Il ruolo "Segnalatore o operatore di front-office" implica che l'accesso sia riservato a personale interno autenticato del Consorzio/Comuni, oppure è previsto anche un form pubblico aperto ai cittadini senza login?
* **Q6.2 - Visibilità per le Squadre sul territorio:** Una squadra operativa autenticata deve poter visualizzare sulla piattaforma tutte le segnalazioni aperte sul territorio o esclusivamente quelle assegnate alla propria squadra?