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
    } else {
      serverBadge.textContent = 'Server: Error';
      serverBadge.className = 'status-badge error';
    }

    if (data.database === 'ok') {
      dbBadge.textContent = 'DB: OK';
      dbBadge.className = 'status-badge ok';
    } else {
      dbBadge.textContent = 'DB: Error';
      dbBadge.className = 'status-badge error';
    }
  } catch (err) {
    serverBadge.textContent = 'Server: Offline';
    serverBadge.className = 'status-badge error';
    dbBadge.textContent = 'DB: Offline';
    dbBadge.className = 'status-badge error';
  }
}

// Carica la lista delle segnalazioni e le mostra con tutti i dettagli
async function caricaSegnalazioni() {
  const container = document.getElementById('lista-container');

  try {
    const res = await fetch('/segnalazioni');
    if (!res.ok) throw new Error('Errore nel recupero dati');

    const segnalazioni = await res.json();

    if (!Array.isArray(segnalazioni) || segnalazioni.length === 0) {
      container.innerHTML = '<p>Nessuna segnalazione presente nel sistema.</p>';
      return;
    }

    let html = `
      <table class="table-segnalazioni">
        <thead>
          <tr>
            <th>ID</th>
            <th>Titolo & Descrizione</th>
            <th>Indirizzo / GPS</th>
            <th>Area / Categoria</th>
            <th>Canale</th>
            <th>Priorità</th>
            <th>Stato</th>
            <th>Data</th>
          </tr>
        </thead>
        <tbody>
    `;

    segnalazioni.forEach(s => {
      const latLongText = (s.latitudine && s.longitudine) 
        ? `${s.latitudine}, ${s.longitudine}` 
        : '-';

      const dataCreazione = s.creata_il 
        ? new Date(s.creata_il).toLocaleString('it-IT') 
        : '-';

      html += `
        <tr>
          <td>#${s.id || '-'}</td>
          <td>
            <strong>${escapeHtml(s.titolo || '')}</strong>
            <span class="sub-text">${escapeHtml(s.descrizione || 'Nessuna descrizione')}</span>
          </td>
          <td>
            ${escapeHtml(s.indirizzo || 'N/D')}
            <span class="sub-text">GPS: ${latLongText}</span>
          </td>
          <td>
            Area: #${s.id_area || '-'}
            <span class="sub-text">Cat: #${s.id_categoria || '-'}</span>
          </td>
          <td>${s.canale || 'web'}</td>
          <td><span class="tag-priorita ${s.priorita || 'media'}">${s.priorita || 'media'}</span></td>
          <td><span class="badge-stato">${s.stato || 'ricevuta'}</span></td>
          <td><span class="sub-text">${dataCreazione}</span></td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

  } catch (err) {
    container.innerHTML = `<p style="color: var(--danger-color);">Errore durante il caricamento delle segnalazioni.</p>`;
  }
}

// Invia una nuova segnalazione mappando tutti i campi della tabella SQL
async function inviaSegnalazione(e) {
  e.preventDefault();

  const latVal = document.getElementById('latitudine').value;
  const longVal = document.getElementById('longitudine').value;

  const bodyData = {
    titolo: document.getElementById('titolo').value,
    descrizione: document.getElementById('descrizione').value || null,
    indirizzo: document.getElementById('indirizzo').value || null,
    latitudine: latVal ? parseFloat(latVal) : null,
    longitudine: longVal ? parseFloat(longVal) : null,
    priorita: document.getElementById('priorita').value,
    canale: document.getElementById('canale').value,
    id_area: parseInt(document.getElementById('id_area').value, 10),
    id_categoria: parseInt(document.getElementById('id_categoria').value, 10),
    id_utente: parseInt(document.getElementById('id_utente').value, 10)
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
      alert('Segnalazione salvata con successo nel registro!');
    } else {
      const errData = await res.json().catch(() => ({}));
      alert(`Errore ${res.status}: ${errData.errore || errData.message || 'Errore nella validazione dei dati'}`);
    }
  } catch (err) {
    alert('Impossibile contattare il server.');
  }
}

// Sanitizzazione HTML per sicurezza
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, match => {
    const escapeMap = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return escapeMap[match];
  });
}