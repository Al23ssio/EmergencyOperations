// Fa il login con un utente di prova e restituisce il token JWT.
// Gli utenti di prova sono in db/schema.sql (password: Password123!).
async function login(baseUrl, username = 'admin', password = 'Password123!') {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (res.status !== 200) {
    throw new Error(`Login di ${username} fallito (HTTP ${res.status})`);
  }
  const data = await res.json();
  return data.token;
}

module.exports = { login };
