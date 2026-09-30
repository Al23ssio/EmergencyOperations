// src/interventi/lista.js
const interventi = [
  { id: 1, descrizione: 'Albero caduto', tecnicoId: 10 },
  { id: 2, descrizione: 'Allagamento via Roma', tecnicoId: 12 }
];

function filtraInterventi(tutti, utenteId) {
  return tutti.filter(i => i.tecnicoId === utenteId);
}

module.exports = { filtraInterventi, interventi };