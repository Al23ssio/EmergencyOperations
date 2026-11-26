/**
 * ============================================================================
 * CONFIGURAZIONE AUTENTICAZIONE (AUTH_CONFIG)
 * ============================================================================
 */
const AUTH_CONFIG = {
  loginEndpoint: '/api/auth/login',
  logoutEndpoint: null,
  strategy: 'bearer',
  payloadKeys: {
    identifier: 'username',
    password: 'password'
  },
  extractToken: (data) => data.token || data.accessToken || null,
  extractUser: (data) => {
    const u = data.user || data.utente || data;
    return {
      id: u.id ?? u.id_utente,
      nome: u.nome || u.username || u.email || 'Utente',
      ruolo: normalizeRole(u.ruolo || u.role || 'guest'),
      id_squadra: u.id_squadra ?? null,
      id_area: u.id_area ?? null
    };
  },
  storageKey: 'eo_auth_session'
};

/**
 * Normalizza i nomi dei ruoli (supporta sia quelli del DB sia quelli del mock)
 */
function normalizeRole(rawRole) {
  const r = String(rawRole || '').trim().toLowerCase();
  if (r === 'admin' || r === 'amministratore') return 'amministratore';
  if (r === 'operatore' || r === 'operatore di centrale' || r === 'operatore_centrale' || r === 'user') {
    return 'operatore_centrale';
  }
  if (r === 'segnalatore') return 'segnalatore';
  if (r === 'squadra') return 'squadra';
  if (r === 'responsabile') return 'responsabile';
  return 'guest';
}

/**
 * ============================================================================
 * MATRICE DEI PERMESSI PER RUOLO (RBAC UI)
 * ============================================================================
 */
const ROLE_PERMISSIONS = {
  guest: {
    label: 'Ospite',
    scopeDescription: 'Vista pubblica in sola lettura — accedi per operare',
    viewScope: 'all',
    canCreateReport: false,
    allowedStatusTransitions: [],
    canAddNotes: false,
    canManageUsers: false
  },
  segnalatore: {
    label: 'Segnalatore',
    scopeDescription: 'Vista Segnalatore: visualizzi solo le segnalazioni inviate da te e puoi aggiungere note',
    viewScope: 'own',
    canCreateReport: true,
    allowedStatusTransitions: [],
    canAddNotes: true,
    canManageUsers: false
  },
  operatore_centrale: {
    label: 'Operatore di centrale',
    scopeDescription: 'Vista Centrale Operativa: vedi tutte le segnalazioni, puoi crearne e gestirne valutazione/assegnazione/chiusura',
    viewScope: 'all',
    canCreateReport: true,
    allowedStatusTransitions: ['valutata', 'assegnata', 'chiusa'],
    canAddNotes: true,
    canManageUsers: false
  },
  squadra: {
    label: 'Squadra',
    scopeDescription: 'Vista Squadra: vedi solo le segnalazioni assegnate alla tua squadra e aggiorni l\'intervento',
    viewScope: 'team',
    canCreateReport: false,
    allowedStatusTransitions: ['in_intervento', 'risolta'],
    canAddNotes: true,
    canManageUsers: false
  },
  responsabile: {
    label: 'Responsabile',
    scopeDescription: 'Vista Responsabile (supervisione): vedi tutte le segnalazioni e puoi aggiungere note',
    viewScope: 'all',
    canCreateReport: false,
    allowedStatusTransitions: [],
    canAddNotes: true,
    canManageUsers: false
  },
  amministratore: {
    label: 'Amministratore',
    scopeDescription: 'Vista Amministratore: accesso completo a segnalazioni, stati, note e gestione utenti',
    viewScope: 'all',
    canCreateReport: true,
    allowedStatusTransitions: ['valutata', 'assegnata', 'in_intervento', 'risolta', 'chiusa'],
    canAddNotes: true,
    canManageUsers: true
  }
};

const ALL_WORKFLOW_STATES = [
  'ricevuta',
  'valutata',
  'assegnata',
  'in_intervento',
  'risolta',
  'chiusa'
];

/**
 * ============================================================================
 * GESTIONE SESSIONE E INTERFACCIA UTENTE (AuthManager)
 * ============================================================================
 */
const AuthManager = (() => {
  let state = { token: null, user: null };

  function init() {
    try {
      const saved = localStorage.getItem(AUTH_CONFIG.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.user) {
          parsed.user.ruolo = normalizeRole(parsed.user.ruolo);
          state = parsed;
        }
      }
    } catch {
      clearSession();
    }
    bindEvents();
    render();
  }

  function saveSession(token, user) {
    state = { token, user };
    localStorage.setItem(AUTH_CONFIG.storageKey, JSON.stringify(state));
    render();
  }

  function clearSession() {
    state = { token: null, user: null };
    localStorage.removeItem(AUTH_CONFIG.storageKey);
    render();
  }

  function isAuthenticated() {
    return AUTH_CONFIG.strategy === 'bearer'
      ? Boolean(state.token && state.user)
      : Boolean(state.user);
  }

  function getUser() { return state.user; }
  function getUserId() { return state.user ? state.user.id : null; }
  function getToken() { return state.token; }

  function getRoleKey() {
    return isAuthenticated() ? normalizeRole(state.user.ruolo) : 'guest';
  }

  function getPermissions() {
    return ROLE_PERMISSIONS[getRoleKey()] || ROLE_PERMISSIONS.guest;
  }

  function openLoginModal(message = '') {
    const modal = document.getElementById('login-modal');
    const errBox = document.getElementById('login-error-box');
    if (message) {
      errBox.textContent = message;
      errBox.classList.remove('hidden');
    } else {
      errBox.classList.add('hidden');
    }
    modal.classList.remove('hidden');
    document.getElementById('login-identifier').focus();
  }

  function closeLoginModal() {
    document.getElementById('login-modal').classList.add('hidden');
    document.getElementById('login-form').reset();
    document.getElementById('login-error-box').classList.add('hidden');
  }

  function showForbiddenAlert(message) {
    const alertBox = document.getElementById('rbac-alert');
    document.getElementById('rbac-alert-message').textContent =
      message || 'Permessi insufficienti (403): azione non consentita per il tuo ruolo.';
    alertBox.classList.remove('hidden');
  }

  /**
   * Mostra/nasconde le sezioni della pagina in base ai permessi del ruolo
   */
  function render() {
    const guestView = document.getElementById('auth-guest-view');
    const userView = document.getElementById('auth-user-view');
    const nameEl = document.getElementById('current-user-name');
    const roleEl = document.getElementById('current-user-role');

    const formCard = document.getElementById('card-nuova-segnalazione');
    const formHint = document.getElementById('form-auth-hint');
    const scopeBanner = document.getElementById('role-scope-banner');
    const usersCard = document.getElementById('card-gestione-utenti');

    const perms = getPermissions();
    const roleKey = getRoleKey();

    if (isAuthenticated()) {
      guestView.classList.add('hidden');
      userView.classList.remove('hidden');

      nameEl.textContent = state.user.nome;
      roleEl.textContent = perms.label;
      roleEl.setAttribute('data-role', roleKey);
    } else {
      guestView.classList.remove('hidden');
      userView.classList.add('hidden');

      nameEl.textContent = '-';
      roleEl.textContent = '-';
      roleEl.removeAttribute('data-role');
    }

    // 1. Visibilità Form "Nuova Segnalazione"
    if (perms.canCreateReport) {
      formCard?.classList.remove('hidden');
      if (formHint) {
        formHint.textContent = `Operatore: ${state.user.nome} (${perms.label})`;
      }
    } else {
      formCard?.classList.add('hidden');
      if (formHint) formHint.textContent = '';
    }

    // 2. Banner descrittivo sopra il Registro Segnalazioni
    if (scopeBanner) {
      scopeBanner.textContent = perms.scopeDescription;
    }

    // 3. Visibilità Sezione "Gestione Utenti" (solo Amministratore)
    if (perms.canManageUsers) {
      usersCard?.classList.remove('hidden');
      caricaUtenti();
    } else {
      usersCard?.classList.add('hidden');
    }
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    const identifier = document.getElementById('login-identifier').value.trim();
    const password = document.getElementById('login-password').value;
    const errBox = document.getElementById('login-error-box');
    const btn = document.getElementById('btn-submit-login');

    errBox.classList.add('hidden');
    btn.disabled = true;

    try {
      const res = await fetch(AUTH_CONFIG.loginEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: AUTH_CONFIG.strategy === 'cookie' ? 'include' : 'same-origin',
        body: JSON.stringify({
          [AUTH_CONFIG.payloadKeys.identifier]: identifier,
          [AUTH_CONFIG.payloadKeys.password]: password
        })
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        errBox.textContent = data.errore || data.message || 'Credenziali non valide.';
        errBox.classList.remove('hidden');
        return;
      }

      if (!res.ok) {
        errBox.textContent = data.errore || `Errore di accesso (${res.status}).`;
        errBox.classList.remove('hidden');
        return;
      }

      saveSession(AUTH_CONFIG.extractToken(data), AUTH_CONFIG.extractUser(data));
      closeLoginModal();
      caricaSegnalazioni();
    } catch {
      errBox.textContent = 'Impossibile contattare il server di autenticazione.';
      errBox.classList.remove('hidden');
    } finally {
      btn.disabled = false;
    }
  }

  async function logout() {
    if (AUTH_CONFIG.logoutEndpoint) {
      try {
        await fetch(AUTH_CONFIG.logoutEndpoint, {
          method: 'POST',
          headers: state.token ? { Authorization: `Bearer ${state.token}` } : {},
          credentials: AUTH_CONFIG.strategy === 'cookie' ? 'include' : 'same-origin'
        });
      } catch {
        // Ignora errori in uscita
      }
    }
    clearSession();
    caricaSegnalazioni();
  }

  function bindEvents() {
    document.getElementById('btn-open-login')?.addEventListener('click', () => openLoginModal());
    document.getElementById('btn-close-login')?.addEventListener('click', closeLoginModal);
    document.getElementById('btn-logout')?.addEventListener('click', logout);
    document.getElementById('login-form')?.addEventListener('submit', handleLoginSubmit);
    document.getElementById('btn-close-rbac-alert')?.addEventListener('click', () => {
      document.getElementById('rbac-alert').classList.add('hidden');
    });
  }

  return {
    init,
    isAuthenticated,
    getUser,
    getUserId,
    getToken,
    getPermissions,
    clearSession,
    openLoginModal,
    showForbiddenAlert
  };
})();

/**
 * ============================================================================
 * WRAPPER CENTRALIZZATO API (apiFetch)
 * ============================================================================
 */
async function apiFetch(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = AuthManager.getToken();

  if (AUTH_CONFIG.strategy === 'bearer' && token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let body = options.body;
  const method = (options.method || 'GET').toUpperCase();
  const loggedUserId = AuthManager.getUserId();

  if (body && typeof body === 'string' && ['POST', 'PATCH', 'PUT'].includes(method)) {
    try {
      const parsed = JSON.parse(body);
      if (loggedUserId !== null && parsed && typeof parsed === 'object' && !parsed.id_utente) {
        parsed.id_utente = loggedUserId;
      }
      body = JSON.stringify(parsed);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    } catch {
      // Body non JSON
    }
  }

  const res = await fetch(url, {
    ...options,
    headers,
    body,
    credentials: AUTH_CONFIG.strategy === 'cookie' ? 'include' : (options.credentials || 'same-origin')
  });

  if (res.status === 401) {
    AuthManager.clearSession();
    AuthManager.openLoginModal('Sessione scaduta o accesso richiesto per questa operazione.');
  } else if (res.status === 403) {
    const errData = await res.clone().json().catch(() => ({}));
    AuthManager.showForbiddenAlert(
      errData.errore || errData.message || 'Accesso negato (403): permessi insufficienti per il tuo ruolo.'
    );
  }

  return res;
}

/**
 * ============================================================================
 * LOGICA APPLICATIVA
 * ============================================================================
 */
document.addEventListener('DOMContentLoaded', () => {
  AuthManager.init();
  checkHealth();
  caricaSegnalazioni();

  document.getElementById('form-segnalazione')?.addEventListener('submit', inviaSegnalazione);
  document.getElementById('btn-refresh')?.addEventListener('click', caricaSegnalazioni);
  document.getElementById('btn-refresh-utenti')?.addEventListener('click', caricaUtenti);
  document.getElementById('form-nuovo-utente')?.addEventListener('submit', creaNuovoUtente);
});

async function checkHealth() {
  const serverBadge = document.getElementById('server-status');
  const dbBadge = document.getElementById('db-status');

  try {
    const res = await fetch('/health');
    const data = await res.json();

    serverBadge.textContent = data.server === 'ok' ? 'Server: OK' : 'Server: Error';
    serverBadge.className = data.server === 'ok' ? 'status-badge ok' : 'status-badge error';

    dbBadge.textContent = data.database === 'ok' ? 'DB: OK' : 'DB: Error';
    dbBadge.className = data.database === 'ok' ? 'status-badge ok' : 'status-badge error';
  } catch {
    serverBadge.textContent = 'Server: Offline';
    serverBadge.className = 'status-badge error';
    dbBadge.textContent = 'DB: Offline';
    dbBadge.className = 'status-badge error';
  }
}

/**
 * Carica e filtra la lista delle segnalazioni in base al ruolo attivo
 */
async function caricaSegnalazioni() {
  const container = document.getElementById('lista-container');
  const perms = AuthManager.getPermissions();
  const currentUser = AuthManager.getUser();

  try {
    const res = await apiFetch('/segnalazioni');
    if (!res.ok) throw new Error('Errore nel recupero dati');

    let segnalazioni = await res.json();
    if (!Array.isArray(segnalazioni)) segnalazioni = [];

    // Filtro visivo lato client (in supporto al filtro lato server)
    if (currentUser) {
      if (perms.viewScope === 'own') {
        segnalazioni = segnalazioni.filter(s => Number(s.id_utente) === Number(currentUser.id));
      } else if (perms.viewScope === 'team') {
        if (currentUser.id_squadra) {
          segnalazioni = segnalazioni.filter(s => Number(s.id_squadra) === Number(currentUser.id_squadra));
        } else if (currentUser.id_area) {
          segnalazioni = segnalazioni.filter(s => Number(s.id_area) === Number(currentUser.id_area));
        }
      }
    }

    if (segnalazioni.length === 0) {
      container.innerHTML = '<p>Nessuna segnalazione visibile per il tuo profilo.</p>';
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
            <th>Priorità</th>
            <th>Stato</th>
            <th>Data</th>
            <th>Azioni</th>
          </tr>
        </thead>
        <tbody>
    `;

    segnalazioni.forEach(s => {
      const latLongText = (s.latitudine && s.longitudine) ? `${s.latitudine}, ${s.longitudine}` : '-';
      const dataCreazione = s.creata_il ? new Date(s.creata_il).toLocaleString('it-IT') : '-';

      // Tendina stato nell'ordine reale del workflow
      let statusDropdownHtml = '';
      if (perms.allowedStatusTransitions.length > 0) {
        const currentStato = s.stato || 'ricevuta';
        const currentIndex = ALL_WORKFLOW_STATES.indexOf(currentStato);

        const optionsHtml = ALL_WORKFLOW_STATES.map((st, idx) => {
          const isCurrent = st === currentStato;
          const isAllowedNext = idx > currentIndex && perms.allowedStatusTransitions.includes(st);
          const label = isCurrent ? `${st} (attuale)` : st;

          return `<option value="${escapeHtml(st)}" ${isCurrent ? 'selected' : ''} ${!isAllowedNext ? 'disabled' : ''}>${escapeHtml(label)}</option>`;
        }).join('');

        statusDropdownHtml = `
          <select class="select-stato-azione" data-id="${s.id}" aria-label="Cambia stato segnalazione #${s.id}">
            ${optionsHtml}
          </select>
        `;
      }

      const viewNotesButton = `<button type="button" class="btn-action-note" data-action="view-notes" data-id="${s.id}">📋 Note</button>`;
      const addNoteButton = perms.canAddNotes
        ? `<button type="button" class="btn-action-note" data-action="add-note" data-id="${s.id}">+ Nota</button>`
        : '';

      const actionsHtml = `<td><div class="action-buttons-group">${statusDropdownHtml}${viewNotesButton}${addNoteButton}</div></td>`;

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
          <td><span class="tag-priorita ${escapeHtml(s.priorita || 'media')}">${escapeHtml(s.priorita || 'media')}</span></td>
          <td><span class="badge-stato">${escapeHtml(s.stato || 'ricevuta')}</span></td>
          <td><span class="sub-text">${dataCreazione}</span></td>
          ${actionsHtml}
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

    // Collega gli eventi alla tendina di cambio stato e ai pulsanti note
    container.querySelectorAll('.select-stato-azione').forEach(select => {
      select.addEventListener('change', () => {
        if (select.value) {
          aggiornaStatoSegnalazione(select.dataset.id, select.value);
        }
      });
    });
    container.querySelectorAll('[data-action="view-notes"]').forEach(btn => {
      btn.addEventListener('click', () => visualizzaNoteSegnalazione(btn.dataset.id));
    });
    container.querySelectorAll('[data-action="add-note"]').forEach(btn => {
      btn.addEventListener('click', () => aggiungiNotaSegnalazione(btn.dataset.id));
    });

  } catch {
    container.innerHTML = `<p style="color: var(--danger-color);">Errore durante il caricamento delle segnalazioni.</p>`;
  }
}

async function inviaSegnalazione(e) {
  e.preventDefault();

  if (!AuthManager.getPermissions().canCreateReport) {
    AuthManager.showForbiddenAlert('Il tuo ruolo non è abilitato alla creazione di nuove segnalazioni.');
    return;
  }

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
    id_utente: AuthManager.getUserId()
  };

  try {
    const res = await apiFetch('/segnalazioni', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyData)
    });

    if (res.ok) {
      document.getElementById('form-segnalazione').reset();
      caricaSegnalazioni();
      alert('Segnalazione salvata con successo!');
    } else if (res.status !== 401 && res.status !== 403) {
      const errData = await res.json().catch(() => ({}));
      alert(`Errore ${res.status}: ${errData.errore || errData.message || 'Errore nella validazione'}`);
    }
  } catch {
    alert('Impossibile contattare il server.');
  }
}

async function aggiornaStatoSegnalazione(id, nuovoStato) {
  try {
    const res = await apiFetch(`/segnalazioni/${id}/stato`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stato: nuovoStato })
    });

    if (res.ok) {
      caricaSegnalazioni();
    } else if (res.status !== 401 && res.status !== 403) {
      const errData = await res.json().catch(() => ({}));
      alert(`Errore ${res.status}: ${errData.errore || errData.message || 'Transizione di stato non consentita'}`);
      caricaSegnalazioni();
    }
  } catch {
    alert('Impossibile contattare il server.');
  }
}

async function visualizzaNoteSegnalazione(id) {
  try {
    const res = await apiFetch(`/segnalazioni/${id}`);
    if (!res.ok) {
      alert(`Errore ${res.status} nel recupero delle note.`);
      return;
    }

    const dettaglio = await res.json();
    let note = Array.isArray(dettaglio)
      ? dettaglio
      : (dettaglio.note || dettaglio.note_intervento || dettaglio.notes || []);

    if (note.length === 0) {
      const resNote = await apiFetch(`/segnalazioni/${id}/note`);
      if (resNote.ok) {
        const dataNote = await resNote.json();
        note = Array.isArray(dataNote) ? dataNote : (dataNote.note || dataNote.note_intervento || []);
      }
    }

    if (note.length === 0) {
      alert(`Nessuna nota presente per la segnalazione #${id}.`);
      return;
    }

    const elenco = note.map(n => {
      const data = n.creata_il ? new Date(n.creata_il).toLocaleString('it-IT') : '';
      const autore = n.autore || n.username || `Utente #${n.id_utente || '-'}`;
      return `[${data}] ${autore}:\n${n.testo || n.nota || ''}`;
    }).join('\n\n----------------\n\n');

    alert(`Note per la segnalazione #${id}:\n\n${elenco}`);
  } catch {
    alert('Impossibile recuperare le note dal server.');
  }
}

async function aggiungiNotaSegnalazione(id) {
  const testo = prompt(`Inserisci una nota operativa per la segnalazione #${id}:`);
  if (!testo || !testo.trim()) return;

  try {
    const res = await apiFetch(`/segnalazioni/${id}/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ testo: testo.trim() })
    });

    if (res.ok) {
      alert('Nota aggiunta correttamente.');
    } else if (res.status !== 401 && res.status !== 403) {
      const errData = await res.json().catch(() => ({}));
      alert(`Errore ${res.status}: ${errData.errore || errData.message || 'Impossibile salvare la nota'}`);
    }
  } catch {
    alert('Impossibile contattare il server.');
  }
}

/**
 * Sezione Amministratore: Gestione Utenti (GET / POST /utenti)
 */
async function caricaUtenti() {
  const container = document.getElementById('lista-utenti-container');
  if (!container || !AuthManager.getPermissions().canManageUsers) return;

  try {
    const res = await apiFetch('/utenti');
    if (!res.ok) {
      container.innerHTML = `<p class="sub-text">Endpoint /utenti non ancora esposto dal backend (${res.status}).</p>`;
      return;
    }

    const utenti = await res.json();
    if (!Array.isArray(utenti) || utenti.length === 0) {
      container.innerHTML = '<p class="sub-text">Nessun utente trovato.</p>';
      return;
    }

    let html = `
      <table class="table-segnalazioni">
        <thead>
          <tr>
            <th>ID</th>
            <th>Username</th>
            <th>Email</th>
            <th>Ruolo</th>
          </tr>
        </thead>
        <tbody>
    `;

    utenti.forEach(u => {
      html += `
        <tr>
          <td>#${u.id ?? u.id_utente ?? '-'}</td>
          <td><strong>${escapeHtml(u.username || u.nome || '-')}</strong></td>
          <td>${escapeHtml(u.email || '-')}</td>
          <td><span class="badge-stato">${escapeHtml(u.ruolo || u.role || '-')}</span></td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;
  } catch {
    container.innerHTML = '<p class="sub-text">Impossibile caricare la lista utenti.</p>';
  }
}

async function creaNuovoUtente(e) {
  e.preventDefault();
  if (!AuthManager.getPermissions().canManageUsers) return;

  const payload = {
    username: document.getElementById('new-user-username').value.trim(),
    email: document.getElementById('new-user-email').value.trim(),
    ruolo: document.getElementById('new-user-role').value,
    password: document.getElementById('new-user-password').value
  };

  try {
    const res = await apiFetch('/utenti', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      document.getElementById('form-nuovo-utente').reset();
      caricaUtenti();
      alert('Nuovo utente creato con successo!');
    } else if (res.status !== 401 && res.status !== 403) {
      const errData = await res.json().catch(() => ({}));
      alert(`Errore ${res.status}: ${errData.errore || errData.message || 'Errore nella creazione utente'}`);
    }
  } catch {
    alert('Impossibile contattare il server.');
  }
}

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