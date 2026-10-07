Requisiti — Emergency Operations / Territorio Sicuro Consorzio




Team
Ignat Gabriel, Spaneshi Sabrina, Innocenti Alessio, Nuvoli Carmen
Cliente
Territorio Sicuro Consorzio
Data
23/09/2026
Versione
v1 — provvisoria

Problema
In tre righe: cosa non funziona oggi per il cliente, per chi, con quale conseguenza concreta. Non descrivete ancora una soluzione.

Le segnalazioni arrivano attraverso telefono, e-mail e diversi canali non coordinati. Gli operatori di centrale e il personale di supporto devono ricostruire manualmente priorità, stato dell'intervento e squadra incaricata. Ciò causa ritardi nell'intervento, mancanza di tracciabilità dello storico e rischio di dispersione delle informazioni critiche sul territorio. 
Obiettivi del progetto
Elenco breve, dal punto di vista del cliente: cosa vuole ottenere, non come.

Raccogliere e centralizzare tutte le segnalazioni sul territorio in un unico sistema condiviso.
Automatizare e facilitare la classificazione e la prioritizzazione degli eventi tramite strumenti di supporto.
Assegnare in modo chiaro e rapido gli interventi alle squadre operative monitorandone lo stato.
Mantenere uno storico completo, tracciabile e consultabile delle attività e delle modifiche effettuate.
Offrire una visione complessiva in tempo reale delle criticità territoriali ai responsabili.

Requisiti funzionali
Frasi su cui si può rispondere sì o no. Numerate, così potete richiamarle nei casi d'uso e nel backlog.

#
Requisito
RF1
Gestione Ciclo di Vita: Il sistema consente la creazione, la valutazione, l'assegnazione, la gestione dello stato (ricevuta, valutata, assegnata, in intervento, risolta, chiusa), l'aggiornamento e la chiusura di una segnalazione. 
RF2
Supporto IA: Il sistema suggerisce categoria e priorità tramite IA in base alla descrizione della segnalazione, richiedendo la conferma dell'operatore e mostrando visibilmente che si tratta di un suggerimento automatico. 
RF3
Ricerca e Log Modifiche: Il sistema offre una ricerca con filtri (per categoria, priorità, area geografica, squadra e periodo) e consente la consultazione dell'intero log di tracciabilità delle modifiche e delle assegnazioni. 
RF4
Geolocalizzazione ed Allegati: Il sistema permette la registrazione e la visualizzazione della localizzazione (tramite indirizzo o coordinate) e l’aggiunta di fotografie allegate e note di aggiornamento. 
RF5
Autenticazione e Controllo Accessi: Il sistema gestisce l'accesso basato su ruoli distinti (Segnalatore/Front-office, Operatore di centrale, Squadra sul territorio, Responsabile, Amministratore) limitando le visibilità e le funzionalità operative. 

Requisiti non funzionali
Anche questi verificabili, non aggettivi. Se non riuscite a dire come lo misurereste, non è ancora un requisito.

#
Requisito
RNF1
Stabilità del sistema
sotto carico esteso.
RNF2
Presenza di log di errore
ed endpoint di Health
Check dei servizi.
RNF3
Gli errori devono essere registrati e diagnosticabili.
RNF4
La progettazione deve dividere i servizi degli utenti dalla parte per i componenti di supporto


✗ "Il sistema deve essere veloce" — ✓ "La lista degli interventi aperti compare in meno di 2 secondi con 5.000 interventi a archivio"
Vincoli dichiarati dal cliente
Copiateli dalla richiesta cliente: cosa il cliente esclude o impone esplicitamente (stack libero salvo diversa indicazione, ambiente di esecuzione, dati di test, ecc.).

Non è richiesta una vera integrazione con centrali di emergenza o servizi pubblici.
Le coordinate e gli eventi sul territorio potranno essere simulati.
Il cliente non impone una specifica piattaforma tecnologica.
La soluzione deve poter essere dimostrata anche con più segnalazioni ed utenti operativi contemporanei.

Glossario
Solo se nella richiesta cliente ci sono termini di dominio che userete spesso e che non sono ovvi fuori da questo progetto.

Termine
Significato
Segnalazione 
Evento o problematica sul territorio (es. albero caduto, allagamento, guasto) registrato nel sistema con localizzazione, descrizione e categoria. 
Ciclo di Vita (Stati) 
Sequenza ordinata di stati attraverso cui passa un intervento: Ricevuta  Valutata  Assegnata  In intervento  Risolta  Chiusa. 
Squadra Operativa 
Unità di personale che opera fisicamente sul territorio incaricata di svolgere e aggiornare l'intervento. 
Suggerimento IA 
Proposta automatizzata generata dall'Intelligenza Artificiale per classificare categoria e priorità in base al testo inserito, soggetta a validazione umana. 
Health Check 
Interfaccia/Endpoint software che restituisce lo stato di salute di un microservizio, del database o delle integrazioni esterne 


