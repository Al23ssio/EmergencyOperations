const API_URL = '/segnalazioni';

// Funzione per caricare le segnalazioni dal backend reale
async function caricaSegnalazioni() {
  const tbody = document.getElementById('segnalazioni-list');
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Errore HTTP: ${response.status}`);
    }
    const data = await response.json();

    tbody.innerHTML = '';

    if (data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5">Nessuna segnalazione presente.</td></tr>';
      return;
    }

    data.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${s.id}</td>
        <td>${s.descrizione || '-'}</td>
        <td>${s.categoria || '-'}</td>
        <td>${s.priorita || '-'}</td>
        <td><span class="status">${s.stato || 'ricevuta'}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } catch (error) {
    console.error('Errore nel recupero delle segnalazioni:', error);
    tbody.innerHTML = '<tr><td colspan="5" style="color: red;">Errore nel caricamento dei dati dal server.</td></tr>';
  }
}

// Funzione per inviare una nuova segnalazione
document.getElementById('form-segnalazione').addEventListener('submit', async (e) => {
  e.preventDefault();

  const nuovaSegnalazione = {
    descrizione: document.getElementById('descrizione').value,
    categoria: document.getElementById('categoria').value,
    priorita: document.getElementById('priorita').value,
    // temporaneamente id_utente mockato come annotato nei limiti noti
    id_utente: 1
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(nuovaSegnalazione)
    });

    if (response.ok) {
      document.getElementById('form-segnalazione').reset();
      caricaSegnalazioni(); // Ricarica la tabella
    } else {
      alert('Errore durante il salvataggio della segnalazione.');
    }
  } catch (error) {
    console.error('Errore durante l’invio:', error);
    alert('Impossibile comunicare con il server.');
  }
});

// Carica i dati all'apertura della pagina
caricaSegnalazioni();