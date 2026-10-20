// src/interventi/lista.js
const interventi = [
  { id: 1, descrizione: 'Albero caduto', tecnicoId: 10, stato: 'assegnata' },
  { id: 2, descrizione: 'Allagamento via Roma', tecnicoId: 12, stato: 'in_intervento' },
  { id: 3, descrizione: 'Buche in via Milano', tecnicoId: 10, stato: 'risolta' },
  { id: 4, descrizione: 'Guasto illuminazione', tecnicoId: 15, stato: 'assegnata' }
];

const STATI_INTERVENTO = ['assegnata', 'in_intervento', 'risolta'];

function filtraInterventi(tutti, utenteId) {
  const id = Number(utenteId);
  if (!Number.isInteger(id)) {
    return [];
  }

  return tutti.filter(i => Number(i.tecnicoId) === id);
}

function listaInterventi(utenteId, stato) {
  let risultati = interventi;

  if (utenteId !== undefined && utenteId !== null && utenteId !== '') {
    risultati = filtraInterventi(risultati, utenteId);
  }

  if (stato) {
    risultati = risultati.filter(i => i.stato === stato);
  }

  return risultati;
}

function aggiornaStatoIntervento(id, nuovoStato) {
  const statoValido = STATI_INTERVENTO.includes(nuovoStato);
  if (!statoValido) {
    return { errore: 'stato non valido', code: 400 };
  }

  const intervento = interventi.find(i => Number(i.id) === Number(id));
  if (!intervento) {
    return { errore: 'intervento non trovato', code: 404 };
  }

  const statoCorrente = intervento.stato;
  const transizioni = {
    assegnata: ['in_intervento', 'risolta'],
    in_intervento: ['risolta'],
    risolta: []
  };

  if (!transizioni[statoCorrente]?.includes(nuovoStato)) {
    return { errore: `transizione non valida: ${statoCorrente} -> ${nuovoStato}`, code: 400 };
  }

  intervento.stato = nuovoStato;
  return { intervento, code: 200 };
}

module.exports = { filtraInterventi, listaInterventi, aggiornaStatoIntervento, interventi, STATI_INTERVENTO };