**RUOLO**(**id**, nome, descrizione)

**UTENTE**(**id**, username, email, password_hash, nome_cognome, attivo, *id_ruolo*)

* *id_ruolo* $\rightarrow$ **RUOLO**(*id*)



**SQUADRA**(**id**, nome, attiva)

**SQUADRA_UTENTE**(**id_squadra**, **id_utente**)

* *id_squadra* $\rightarrow$ **SQUADRA**(*id*)


* *id_utente* $\rightarrow$ **UTENTE**(*id*)



**AREA**(**id**, nome, codice_comune)

**CATEGORIA**(**id**, nome, descrizione)

**SEGNALAZIONE**(**id**, titolo, descrizione, indirizzo, latitudine, longitudine, priorita, stato, canale, classificazione_ai, creata_il, chiusa_il, *id_utente*, *id_area*, *id_categoria*, *id_squadra_assegnata*, *id_utente_assegnato*)

* *id_utente* $\rightarrow$ **UTENTE**(*id*)


* *id_squadra_assegnata* $\rightarrow$ **SQUADRA**(*id*) — squadra che ha in carico ora la segnalazione (facoltativo)


* *id_utente_assegnato* $\rightarrow$ **UTENTE**(*id*) — persona che ha in carico ora la segnalazione (facoltativo; mai insieme alla squadra)


* *id_area* $\rightarrow$ **AREA**(*id*)


* *id_categoria* $\rightarrow$ **CATEGORIA**(*id*)



**ALLEGATO**(**id**, nome_file, percorso, mime_type, dimensione, caricato_il, *id_segnalazione*)

* *id_segnalazione* $\rightarrow$ **SEGNALAZIONE**(*id*)



**ASSEGNAZIONE**(**id**, assegnata_il, terminata_il, *id_squadra*, *id_utente_assegnato*, *id_utente*, *id_segnalazione*)

* *id_squadra* $\rightarrow$ **SQUADRA**(*id*) — oppure:


* *id_utente_assegnato* $\rightarrow$ **UTENTE**(*id*) — esattamente uno dei due è valorizzato


* *id_utente* $\rightarrow$ **UTENTE**(*id*)


* *id_segnalazione* $\rightarrow$ **SEGNALAZIONE**(*id*)



**NOTA**(**id**, testo, creata_il, *id_utente*, *id_segnalazione*, *id_allegato*)

* *id_utente* $\rightarrow$ **UTENTE**(*id*)


* *id_segnalazione* $\rightarrow$ **SEGNALAZIONE**(*id*)


* *id_allegato* $\rightarrow$ **ALLEGATO**(*id*)



**STORICO_MODIFICA**(**id**, tipo_evento, campo, valore_precedente, valore_nuovo, timestamp, *id_utente*, *id_segnalazione*)

* *id_utente* $\rightarrow$ **UTENTE**(*id*)


* *id_segnalazione* $\rightarrow$ **SEGNALAZIONE**(*id*)



**SUGGERIMENTO_AI**(**id**, priorita_suggerita, confidenza, modello, accettato, creato_il, *id_segnalazione*, *id_categoria*, *id_utente_validatore*)

* *id_segnalazione* $\rightarrow$ **SEGNALAZIONE**(*id*)


* *id_categoria* $\rightarrow$ **CATEGORIA**(*id*)


* *id_utente_validatore* $\rightarrow$ **UTENTE**(*id*)
