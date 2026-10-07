Attori e casi d'uso — Emergency Operations / Territorio Sicuro Consorzio




Team
Ignat Gabriel, Spaneshi Sabrina, Innocenti Alessio, Nuvoli Carmen
Cliente
Territorio Sicuro Consorzio
Data
23/09/2026
Versione
v1

Attori
Un attore è un ruolo, non una persona: la stessa persona può essere due attori. Prendeteli dalla sezione "utenti e ruoli" della richiesta cliente.

Attore
Cosa ottiene dal sistema
Segnalatore o operatore di front-office 
Registra l'evento inserendo descrizione, localizzazione (tramite indirizzo o coordinate), categoria e fotografie allegate. 
Operatore di centrale 
Classifica e prioritizza le segnalazioni (con l'aiuto dei suggerimenti automatici dell'IA), assegna gli interventi alle squadre operative e monitora lo stato di avanzamento. 
Squadra sul territorio 
Visualizza gli interventi assegnati, aggiorna lo stato operativo (es. "in intervento", "risolta") e inserisce note di lavorazione, riferimenti temporali e fotografie. 
Responsabile 
Consulta la situazione complessiva, effettua ricerche/filtraggi avanzati e analizza lo storico completo di modifiche e assegnazioni. 
Amministratore 
Gestisce gli utenti, i ruoli con accessi differenziati e le configurazioni di sistema. 

Casi d'uso
Formato minimo: attore + azione + risultato osservabile. Un caso d'uso senza attore è una funzione che nessuno ha chiesto; un attore senza casi d'uso è un ruolo inutile. Numerateli: li richiamerete nel backlog.
UC1 —Registrazione di una segnalazione 
Attore: Segnalatore o operatore di front-office 
Precondizione: L'utente si è autenticato ed è posizionato sulla maschera di inserimento della segnalazione. 
Risultato osservabile: La segnalazione viene salvata nel sistema in stato "ricevuta", completa di dati di geolocalizzazione ed eventuali allegati, pronta per la valutazione della centrale. 
UC2 — Classificazione e prioritizzazione della segnalazione (con supporto IA) 
Attore: Operatore di centrale 
Precondizione: Esiste almeno una segnalazione nello stato "ricevuta". 
Risultato osservabile: La segnalazione passa allo stato "valutata", vengono memorizzate la priorità e la categoria (evidenziando chiaramente se suggerite automaticamente dall'IA) e l'operazione viene tracciata nello storico. 
UC3 — Assegnazione dell'intervento alla squadra operativa 
Attore: Operatore di centrale 
Precondizione: La segnalazione si trova nello stato "valutata". 
Risultato osservabile: La segnalazione passa allo stato "assegnata", viene associata alla squadra individuata ed entra a far parte del carico di lavoro visibile a quella specifica squadra. 

UC4 — Aggiornamento dello stato dell'intervento e inserimento note 
Attore: Squadra sul territorio  
Precondizione: La segnalazione è assegnata alla squadra ed è nello stato "assegnata" o "in intervento". 
Risultato osservabile: Lo stato della segnalazione passa a "in intervento" o "risolta", vengono salvate le note e le immagini allegate, e la modifica diventa visibile all'operatore di centrale e al segnalatore. 

UC5 — Chiusura della segnalazione 
Attore: Operatore di centrale 
Precondizione: La segnalazione è stata portata dalla squadra nello stato "risolta". 
Risultato osservabile: La segnalazione passa allo stato "chiusa" e viene archiviata con il tracciamento di tutte le fasi del suo ciclo di vita 

UC6 — Consultazione complessiva, ricerca e filtraggio 
Attore: Responsabile
Precondizione: L'utente ha effettuato l'accesso al sistema con il ruolo appropriato. 
Risultato osservabile: L'utente ottiene la lista e i dettagli delle segnalazioni filtrate e può consultare lo storico completo delle azioni e delle riassegnazioni. 


UC7 — Gestione utenti e configurazioni di sistema 
Attore: Amministratore 
Precondizione: L'utente si è autenticato con il ruolo di Amministratore.  
Risultato osservabile: I dati degli utenti, le autorizzazioni differenziate e i parametri di configurazione vengono aggiornati in modo sicuro nel sistema. 
