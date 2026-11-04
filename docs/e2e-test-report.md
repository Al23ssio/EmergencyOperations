# Report Integrazione End-to-End Multi-Ambiente (Passo 3)

**Responsabile:** Gabriel Ignat (End-to-End Integration & Deployment Lead)  
**Data:** 04/11/2026  

## 1. Esecuzione con la stessa immagine nei due ambienti

L'immagine container `localhost:32000/emergency-operations-backend:1.0.0` viene eseguita senza alcuna modifica al codice sorgente iniettando alternativamente i file di configurazione `config/dev.env` e `config/test.env`.

### Avvio in ambiente DEV (`config/dev.env` - Porta 3000)
```bash
ENV_FILE=config/dev.env PORT=3000 docker compose up -d
node tests/e2e-multi-env.js