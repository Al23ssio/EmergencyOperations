Architettura v1 — Emergency Operations / Territorio Sicuro Consorzio




Team
Ignat Gabriel, Spaneshi Sabrina, Innocenti Alessio, Nuvoli Carmen
Cliente
Territorio Sicuro Consorzio
Data
23/09/2026
Versione
v1 — provvisoria


Questo template è agnostico rispetto al linguaggio: ogni team scelto il proprio stack (linguaggio, framework, database), qui si descrivono componenti e responsabilità, non implementazioni.
Componenti
Un componente è un pezzo che potreste rilasciare, sostituire o spegnere da solo. Per ciascuno: una riga di responsabilità, una di non-responsabilità. Se per descriverne uno vi serve una "e" tra due responsabilità diverse, sono probabilmente due componenti.

Componente
Risponde di
Non risponde di
Frontend Web App 
Far vedere le schermate, la mappa e i bottoni per caricare foto e segnalazioni. 
Non salva i dati nel database e non controlla le password 
Server Backend (API) 
Controllare i login, salvare le segnalazioni e cambiare i vari stati (es. "in corso", "risolto") 
Non disegna le pagine web e non salva direttamente le foto su disco. 
Database (DB) 
Conservare tutti i dati salvati: utenti, segnalazioni, commenti e lo storico delle modifiche. 
Non fa calcoli con l'IA e non mostra niente a schermo. 
Modulo IA (Suggeritore) 
Leggere la descrizione inserita dall'utente e suggerire categoria e priorità (es. albero caduto = alta priorità).
Non decide da solo: l'operatore deve sempre confermare prima di salvare. 
Server Immagini (Storage Foto) 
Salvare le foto scattate e caricate dal territorio. 
Non gestisce gli utenti, i ruoli o i permessi. 

Diagramma
Scatole = componenti, frecce = "chiama"/"dipende da" con sopra cosa passa (es. HTTPS/JSON, SQL, file). Segnate cosa è dentro il vostro perimetro e cosa è fuori (servizi di terzi, sistemi del cliente). Ciò che è previsto ma non ancora realizzato si disegna tratteggiato. Va bene un blocco Mermaid come questo, un disegno fotografato, o qualunque notazione capiate a colpo d'occhio come team — l'importante è che le frecce siano etichettate.

flowchart LR

  Utente -->|HTTPS| Frontend

  Frontend -->|HTTPS/JSON| API[API backend]

  API -->|SQL| DB[(Database)]

  API -.->|previsto: notifiche| Notifiche[Servizio notifiche]
Dipendenze
Elenco esplicito: chi dipende da chi, e cosa succede se il componente da cui si dipende si ferma o risponde male.

Componente
Dipende da
Se si ferma
Frontend Web App 
Server Backend (API) 
L'utente vede un errore di connessione/rete; non è possibile caricare nuove segnalazioni né salvare modifiche. 
Server Backend (API) 
Database (DB) 
L'API restituisce un errore 500 (Internal Server Error); l'intero sistema va in modalità di errore mantenendo attivo solo l'health check. 
Server Backend (API) 
Modulo IA (Suggeritore) 
L'API funziona regolarmente: la segnalazione viene creata comunque, ma il sistema consente all'operatore di selezionare categoria e priorità manualmente. 
Server Backend (API) 
Server Immagini (Storage Foto) 
L'API consente la creazione della segnalazione senza immagini allegate oppure notifica il fallimento dell'upload foto senza bloccare i dati testuali. 

Fuori dal perimetro
Cosa esiste ma non lo costruite voi: sistemi del cliente, servizi esterni, integrazioni future dichiarate nella richiesta.

Integrazione con centrali di emergenza o servizi pubblici: eventi e coordinate sono simulati all'interno della piattaforma.
Servizio notifiche esterne (SMS / Email / Push): Predisposto nell'architettura ma non incluso nel perimetro funzionale di questa versione.
Servizi cartografici o GIS avanzati di terze parti: Predisposizione futura per l'integrazione con mappe esterne e geocoding avanzato.
