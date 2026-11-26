// Middleware di autenticazione (JWT) e autorizzazione per ruolo (RBAC)
const jwt = require('jsonwebtoken');

// I 5 ruoli previsti dal cliente (stessi nomi della tabella "ruolo" nel DB)
const RUOLI = {
  SEGNALATORE: 'segnalatore',
  OPERATORE: 'operatore_centrale',
  SQUADRA: 'squadra',
  RESPONSABILE: 'responsabile',
  ADMIN: 'amministratore'
};

// 1) AUTENTICAZIONE: chi sei?
// Legge l'header "Authorization: Bearer <token>", verifica la firma e la
// scadenza del token e salva i dati dell'utente in req.utente.
// Se il token manca o non e valido -> 401 Unauthorized.
function autentica(req, res, next) {
  const header = req.headers.authorization || '';
  const [tipo, token] = header.split(' ');

  if (tipo !== 'Bearer' || !token) {
    return res.status(401).json({ errore: 'Accesso richiesto: token mancante' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
    req.utente = { id: payload.id, email: payload.email, ruolo: payload.ruolo };
    next();
  } catch (err) {
    return res.status(401).json({ errore: 'Token non valido o scaduto' });
  }
}

// 2) AUTORIZZAZIONE: cosa puoi fare?
// Uso: router.post('/', autentica, autorizza('segnalatore', 'amministratore'), ...)
// Se il ruolo dell'utente non e tra quelli ammessi -> 403 Forbidden.
function autorizza(...ruoliAmmessi) {
  return (req, res, next) => {
    if (!req.utente || !ruoliAmmessi.includes(req.utente.ruolo)) {
      return res.status(403).json({
        errore: `Permessi insufficienti: il ruolo "${req.utente ? req.utente.ruolo : 'ospite'}" non puo eseguire questa operazione`
      });
    }
    next();
  };
}

module.exports = { autentica, autorizza, RUOLI };
