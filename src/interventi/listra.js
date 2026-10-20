// src/interventi/lista.js
const interventi = [
  { id: 1, descrizione: 'Albero caduto', tecnicoId: 10, stato: 'assegnata' },
  { id: 2, descrizione: 'Allagamento via Roma', tecnicoId: 12, stato: 'in_intervento' },
  { id: 3, descrizione: 'Buche in via Milano', tecnicoId: 10, stato: 'risolta' },
  { id: 4, descrizione: 'Guasto illuminazione', tecnicoId: 15, stato: 'assegnata' }
];

function filtraInterventi(tutti, utenteId) {
  const id = Number(utenteId);
  if (!Number.isInteger(id)) {
    return [];
  }

  return tutti.filter(i => Number(i.tecnicoId) === id);
}

function listaInterventi(utenteId) {
  if (utenteId === undefined || utenteId === null || utenteId === '') {
    return interventi;
  }

  return filtraInterventi(interventi, utenteId);
}

module.exports = { filtraInterventi, listaInterventi, interventi };