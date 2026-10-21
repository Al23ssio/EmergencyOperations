document.addEventListener('DOMContentLoaded', () => {
  checkHealth();
  caricaSegnalazioni();

  document.getElementById('form-segnalazione').addEventListener('submit', inviaSegnalazione);
  document.getElementById('btn-refresh').addEventListener('click', caricaSegnalazioni);
});

// Controllo stato Server + DB
async function checkHealth() {
  const serverBadge = document.getElementById('server-status');
  const dbBadge = document.getElementById('db-status');

  try {
    const res = await fetch('/health');
    const data = await res.json();

    if (data.server === 'ok') {
      serverBadge.textContent = 'Server: OK';
      serverBadge.className = 'status-badge ok';
    }
    if (data.database === 'ok') {
      dbBadge.textContent = 'DB: OK';
      dbBadge.className = 'status-badge ok';
    } else {
      dbBadge.textContent = 'DB: Errore';
      dbBadge.className = 'status-badge error';
    }
  } catch (err) {
    serverBadge.textContent = 'Server: Offline';
    serverBadge.className = 'status-badge error';
    dbBadge.textContent = 'DB: Offline';
    dbBadge.className = 'status-badge error';
  }
}

// Carica la lista segnalazioni dal backend
async function caricaSegnalazioni() {
  const container = document.getElementById('lista-container');

  try {
    const res = await fetch('/segnalazioni');
    if (!res.ok) throw new Error('Errore nel recupero dati');
    
    const segnalazioni = await res.json();

    if (segnalazioni.length === 0) {
      container.innerHTML = '<p>Nessuna segnalazione presente nel sistema.</p>';
      return;
    }

    let html = `
      <table class="table-segnalazioni">
        <thead>
          <tr>
            <th>ID</th>
            <th>Descrizione</th>
            <th>Categoria</th>
            <th>Priorità</th>
            <th>Stato</th>
          </tr>
        </thead>
        <tbody>
    `;

    segnalazioni.forEach(s => {
      html += `
        <tr>
          <td>#${s.id || s.id_segnalazione || '-'}</td>
          <td>${s.descrizione || ''}</td>
          <td>${s.categoria || ''}</td>
          <td><span class="tag-priorita ${s.priorita}">${s.priorita || 'media'}</span></td>
          <td>${s.stato || 'aperta'}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = `<p style="color: var(--danger-color);">Errore durante il caricamento delle segnalazioni.</p>`;
  }
}

// Invia una nuova segnalazione
async function inviaSegnalazione(e) {
  e.preventDefault();

  const bodyData = {
    descrizione: document.getElementById('descrizione').value,
    categoria: document.getElementById('categoria').value,
    priorita: document.getElementById('priorita').value,
    id_utente: 1
  };

  try {
    const res = await fetch('/segnalazioni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });

    if (res.ok) {
      document.getElementById('form-segnalazione').reset();
      caricaSegnalazioni();
    } else {
      alert('Errore durante l\'invio della segnalazione.');
    }
  } catch (err) {
    alert('Impossibile contattare il server.');
  }
}