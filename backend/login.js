const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('./db');
const auth = require('./auth');

router.post('/login', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Credentials required' });
  const user = db.prepare('SELECT * FROM users WHERE username = ? AND active = 1').get(username);
  if (!user) return res.status(401).json({ error: "Noto'g'ri username yoki parol!" });
  if (role && user.role !== role) return res.status(401).json({ error: "Bu rol uchun kirish taqiqlangan!" });
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ error: "Noto'g'ri parol!" });
  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role, doctorId: user.doctorId || null },
    process.env.JWT_SECRET || 'secret',
    { expiresIn: '7d' }
  );
  const { password: _, ...safe } = user;
  res.json({ token, user: safe });
});

router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT id,firstName,lastName,username,role,active,photo,doctorId FROM users WHERE id=?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json(user);
});

module.exports = router;
