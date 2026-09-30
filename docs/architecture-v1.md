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
Esempio: Frontend
API backend
l'utente vede un errore, nessun dato scritto due volte







Fuori dal perimetro
Cosa esiste ma non lo costruite voi: sistemi del cliente, servizi esterni, integrazioni future dichiarate nella richiesta.

Esempio: integrazione con sistemi di notifica aziendali (futura, non in v1)
