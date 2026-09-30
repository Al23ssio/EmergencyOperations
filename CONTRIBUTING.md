|  |  |
| :---- | :---- |
| **Progetto** | Emergency Operations |
| **Team** | Team 3 |
| **Data** | 30/09/2026 |
| **Versione** | v0.1 |

Queste regole valgono per tutti i membri del team.

## Branch strategy

main                 sempre funzionante, nessun commit diretto
feature/<cosa>       nuova funzionalità
fix/<cosa>           correzione di un bug
docs/<cosa>          solo documentazione

## Convenzioni di commit

feat: <cosa aggiunge>
fix: <cosa corregge>
docs: <cosa documenta>

Esempio: feat: aggiungi filtro interventi per tecnico

## Pull/merge request e review

Chi può fare merge su main? Chiunque nel team, dopo approvazione.


Quante approvazioni servono prima del merge? 1, da chi non ha scritto il codice.


Cosa NON è accettabile in una review? App


Trovare senza aver letto il diff, bloccare per una preferenza di stile senza motivo.



## Gestione dei conflitti

se un conflitto non si risolve in 10 minuti, si chiama un altro membro del team prima di forzare una scelta da soli.

## Definition of Done

una issue è fatta quando: il codice è mergiato su main · esiste un modo di verificarla (test o passi manuali) · la issue collegata è aggiornata a 'fatto' · nessun segreto o dato finto è rimasto nel codice.

## Issue e board

da fare → in corso → in revisione → fatto
