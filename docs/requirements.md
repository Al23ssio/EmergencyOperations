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

Le segnalazioni arrivano attraverso telefono, e-mail e diversi canali non coordinati. Gli operatori devono spesso ricostruire manualmente priorità, stato e squadra incaricata. 
Obiettivi del progetto
Elenco breve, dal punto di vista del cliente: cosa vuole ottenere, non come.

Il Consorzio desidera una piattaforma condivisa che permetta di gestire il ciclo completo di una segnalazione.
Requisiti funzionali
Frasi su cui si può rispondere sì o no. Numerate, così potete richiamarle nei casi d'uso e nel backlog.

#
Requisito
RF1
Creazione,
aggiornamento,
passaggio di stato e
chiusura della
segnalazione.
RF2
Suggerimento di priorità
e categoria tramite Al,
con conferma
dell'operatore.
RF3
Ricerca avanzata e
consultazione del log
delle modifiche.

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


✗ "Il sistema deve essere veloce" — ✓ "La lista degli interventi aperti compare in meno di 2 secondi con 5.000 interventi a archivio"
Vincoli dichiarati dal cliente
Copiateli dalla richiesta cliente: cosa il cliente esclude o impone esplicitamente (stack libero salvo diversa indicazione, ambiente di esecuzione, dati di test, ecc.).

Non è richiesta una vera integrazione con centrali di emergenza o servizi pubblici.
Le coordinate e gli eventi potranno essere simulati.
Il cliente non impone una specifica piattaforma tecnologica.
La soluzione deve poter essere dimostrata anche con più segnalazioni contemporanee.

Glossario
Solo se nella richiesta cliente ci sono termini di dominio che userete spesso e che non sono ovvi fuori da questo progetto.

Termine
Significato






