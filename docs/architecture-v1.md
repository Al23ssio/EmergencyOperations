# Architettura v1 — Emergency Operations / Territorio Sicuro Consorzio

**Team:** Ignat Gabriel, Spaneshi Sabrina, Innocenti Alessio, Nuvoli Carmen  
**Cliente:** Territorio Sicuro Consorzio  
**Data:** 14/10/2026  
**Versione:** v2  

## Componenti

* **Frontend Web App**
  * *Responsabilità:* Far vedere le schermate, la mappa e i bottoni per caricare foto e segnalazioni. 
  * *Non-responsabilità:* Non salva i dati nel database e non controlla le password.

* **Server Backend (API)**
  * *Responsabilità:* Controllare i login, salvare le segnalazioni e cambiare i vari stati (es. "in corso", "risolto").
  * *Non-responsabilità:* Non disegna le pagine web e non salva direttamente le foto su disco. 

* **Database (DB)**
  * *Responsabilità:* Conservare tutti i dati salvati: utenti, segnalazioni, commenti e lo storico delle modifiche. 
  * *Non-responsabilità:* Non fa calcoli con l'IA e non mostra niente a schermo. 

* **Modulo IA (Suggeritore)**
  * *Responsabilità:* Leggere la descrizione inserita dall'utente e suggerire categoria e priorità (es. albero caduto = alta priorità).
  * *Non-responsabilità:* Non decide da solo: l'operatore deve sempre confermare prima di salvare. 

* **Server Immagini (Storage Foto)**
  * *Responsabilità:* Salvare le foto scattate e caricate dal territorio. 
  * *Non-responsabilità:* Non gestisce gli utenti, i ruoli o i permessi. 

---

## Diagramma

```mermaid
flowchart LR
    Utente -->|HTTPS| Frontend
    Frontend -->|HTTPS/JSON| API[API backend]
    API -->|SQL| DB[(Database)]
    API -.->|previsto: notifiche| Notifiche[Servizio notifiche]