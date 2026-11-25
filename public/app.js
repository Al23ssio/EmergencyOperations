/**
 * CONFIGURAZIONE UNICA AUTENTICAZIONE (AUTH_CONFIG)
 * Quando il collega del backend passa il contratto definitivo, aggiorna SOLO qui.
 */
const AUTH_CONFIG = {
  loginEndpoint: '/api/auth/login',       
  logoutEndpoint: null,     
  strategy: 'bearer',                
  payloadKeys: {
    identifier: 'username',          
    password: 'password'
  },
  extractToken: (data) => data.token || null,
  extractUser: (data) => {
    const u = data.user || {};
    return {
      id: u.id,
      nome: u.username || 'Utente',
      ruolo: (u.role || 'user').toLowerCase()
    };
  },
  storageKey: 'eo_auth_session'
};

/**
 * GESTIONE SESSIONE E INTERFACCIA UTENTE (AuthManager)
 */
const AuthManager = (() => {
  let state = { token: null, user: null };

  function init() {
    try {
      const saved = localStorage.getItem(AUTH_CONFIG.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.user) state = parsed;
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

  function render() {
    const guestView = document.getElementById('auth-guest-view');
    const userView = document.getElementById('auth-user-view');
    const nameEl = document.getElementById('current-user-name');
    const roleEl = document.getElementById('current-user-role');
    const formCard = document.getElementById('card-nuova-segnalazione');
    const formHint = document.getElementById('form-auth-hint');

    if (isAuthenticated()) {
      guestView.classList.add('hidden');
      userView.classList.remove('hidden');
      formCard?.classList.remove('hidden');

      nameEl.textContent = state.user.nome;
      roleEl.textContent = state.user.ruolo;
      roleEl.setAttribute('data-role', state.user.ruolo);

      if (formHint) {
        formHint.textContent = `Operatore: ${state.user.nome} (${state.user.ruolo})`;
      }
    } else {
      guestView.classList.remove('hidden');
      userView.classList.add('hidden');
      formCard?.classList.add('hidden');

      nameEl.textContent = '-';
      roleEl.textContent = '-';
      roleEl.removeAttribute('data-role');
      if (formHint) formHint.textContent = '';
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
        // Ignora errori di rete in uscita
      }
    }
    clearSession();
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
    clearSession,
    openLoginModal,
    showForbiddenAlert
  };
})();

/**
 * PARTE CENTRALIZZATO PER LE CHIAMATE API (apiFetch)
 * - Allega Bearer token / cookie
 * - Inserisce id_utente reale dell'utente loggato nei payload POST/PATCH/PUT
 * - Intercetta globalmente 401 Unauthorized e 403 Forbidden
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
      if (loggedUserId !== null && parsed && typeof parsed === 'object') {
        parsed.id_utente = loggedUserId;
      }
      body = JSON.stringify(parsed);
      if (!headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
    } catch {
      // Body non JSON: inviato invariato
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
      errData.errore || errData.message || 'Accesso negato (403): permessi insufficienti.'
    );
  }

  return res;
}

/**
 * LOGICA APPLICATIVA
 */
document.addEventListener('DOMContentLoaded', () => {
  AuthManager.init();
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
  } catch {
    serverBadge.textContent = 'Server: Offline';
    serverBadge.className = 'status-badge error';
    dbBadge.textContent = 'DB: Offline';
    dbBadge.className = 'status-badge error';
  }
}

// Carica la lista delle segnalazioni
async function caricaSegnalazioni() {
  const container = document.getElementById('lista-container');

  try {
    const res = await apiFetch('/segnalazioni');
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
          <td>${escapeHtml(s.canale || 'web')}</td>
          <td><span class="tag-priorita ${escapeHtml(s.priorita || 'media')}">${escapeHtml(s.priorita || 'media')}</span></td>
          <td><span class="badge-stato">${escapeHtml(s.stato || 'ricevuta')}</span></td>
          <td><span class="sub-text">${dataCreazione}</span></td>
        </tr>
      `;
    });

    html += '</tbody></table>';
    container.innerHTML = html;

  } catch {
    container.innerHTML = `<p style="color: var(--danger-color);">Errore durante il caricamento delle segnalazioni.</p>`;
  }
}

// Invia una nuova segnalazione (solo utenti autenticati)
async function inviaSegnalazione(e) {
  e.preventDefault();

  if (!AuthManager.isAuthenticated()) {
    AuthManager.openLoginModal('Devi effettuare il login per inviare una segnalazione.');
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
      alert('Segnalazione salvata con successo nel registro!');
    } else if (res.status !== 401 && res.status !== 403) {
      const errData = await res.json().catch(() => ({}));
      alert(`Errore ${res.status}: ${errData.errore || errData.message || 'Errore nella validazione dei dati'}`);
    }
  } catch {
    alert('Impossibile contattare il server.');
  }
}

// Sanitizzazione HTML
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