    const express = require('express');
const router = express.Router();

const fakeUsers = [
  { id: 1, username: 'admin', password: 'password123', role: 'admin' },
  { id: 2, username: 'operatore', password: 'operatore123', role: 'user' }
];

router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username e password sono obbligatori'
    });
  }

  const user = fakeUsers.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Credenziali non valide'
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Login effettuato con successo',
    user: {
      id: user.id,
      username: user.username,
      role: user.role
    },
    token: 'fake-jwt-token-123456'
  });
});

module.exports = router;