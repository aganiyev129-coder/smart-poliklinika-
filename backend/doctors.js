const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('./db');
const { requireRole } = require('./auth');

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM doctors ORDER BY id').all());
});

router.post('/', ...requireRole('superadmin'), (req, res) => {
  const { firstName, lastName, spec, start, end, price, phone, exp, photo } = req.body;
  if (!firstName || !lastName) return res.status(400).json({ error: 'Required fields missing' });
  const r = db.prepare('INSERT INTO doctors (firstName,lastName,spec,start,end,price,phone,exp,photo) VALUES (?,?,?,?,?,?,?,?,?)')
    .run(firstName, lastName, spec || 'Terapevt', start || '08:00', end || '17:00', price || 0, phone || '', exp || 0, photo || '');
  const doctorId = r.lastInsertRowid;
  const baseUsername = firstName.toLowerCase().replace(/\s+/g, '');
  let username = baseUsername;
  let suffix = 1;
  while (db.prepare('SELECT id FROM users WHERE username=?').get(username)) {
    username = baseUsername + suffix++;
  }
  const password = baseUsername + '123';
  const hashed = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (firstName,lastName,username,password,role,doctorId) VALUES (?,?,?,?,?,?)')
    .run(firstName, lastName, username, hashed, 'doctor', doctorId);
  const doctor = db.prepare('SELECT * FROM doctors WHERE id=?').get(doctorId);
  res.json({ ...doctor, generatedUsername: username, generatedPassword: password });
});

router.put('/:id', ...requireRole('superadmin'), (req, res) => {
  const { firstName, lastName, spec, start, end, price, phone, exp, photo } = req.body;
  db.prepare('UPDATE doctors SET firstName=?,lastName=?,spec=?,start=?,end=?,price=?,phone=?,exp=?,photo=? WHERE id=?')
    .run(firstName, lastName, spec, start, end, price, phone, exp, photo, req.params.id);
  db.prepare('UPDATE users SET firstName=?,lastName=? WHERE doctorId=?')
    .run(firstName, lastName, req.params.id);
  res.json(db.prepare('SELECT * FROM doctors WHERE id=?').get(req.params.id));
});

router.delete('/:id', ...requireRole('superadmin'), (req, res) => {
  db.prepare('DELETE FROM users WHERE doctorId=?').run(req.params.id);
  db.prepare('DELETE FROM doctors WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
