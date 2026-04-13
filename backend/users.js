const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { requireRole } = require('../middleware/auth');

router.use(...requireRole('superadmin'));

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT id,firstName,lastName,username,role,active,photo,doctorId FROM users ORDER BY id').all());
});

router.post('/', (req, res) => {
  const { firstName, lastName, username, password, role, photo } = req.body;
  if (!firstName || !username || !password) return res.status(400).json({ error: 'Required fields missing' });
  const exists = db.prepare('SELECT id FROM users WHERE username=?').get(username);
  if (exists) return res.status(409).json({ error: 'Bu username band!' });
  const hashed = bcrypt.hashSync(password, 10);
  const r = db.prepare('INSERT INTO users (firstName,lastName,username,password,role,photo) VALUES (?,?,?,?,?,?)').run(firstName, lastName || '', username, hashed, role || 'registrar', photo || '');
  const { password: _, ...safe } = db.prepare('SELECT * FROM users WHERE id=?').get(r.lastInsertRowid);
  res.json(safe);
});

router.put('/:id', (req, res) => {
  const { firstName, lastName, username, password, role, active, photo } = req.body;
  if (password) {
    const hashed = bcrypt.hashSync(password, 10);
    db.prepare('UPDATE users SET firstName=?,lastName=?,username=?,password=?,role=?,active=?,photo=? WHERE id=?').run(firstName, lastName || '', username, hashed, role, active !== undefined ? (active ? 1 : 0) : 1, photo || '', req.params.id);
  } else {
    db.prepare('UPDATE users SET firstName=?,lastName=?,username=?,role=?,active=?,photo=? WHERE id=?').run(firstName, lastName || '', username, role, active !== undefined ? (active ? 1 : 0) : 1, photo || '', req.params.id);
  }
  const { password: _, ...safe } = db.prepare('SELECT * FROM users WHERE id=?').get(req.params.id);
  res.json(safe);
});

router.delete('/:id', (req, res) => {
  if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: "O'z hisobingizni o'chira olmaysiz!" });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
