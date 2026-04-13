const express = require('express');
const router = express.Router();
const db = require('./db');
const auth = require('./auth');

router.use(auth);

router.get('/', (req, res) => {
  const q = req.query.q || '';
  if (q) {
    res.json(db.prepare("SELECT * FROM patients WHERE firstName||' '||lastName||' '||phone LIKE ? ORDER BY id").all(`%${q}%`));
  } else {
    res.json(db.prepare('SELECT * FROM patients ORDER BY id').all());
  }
});

router.get('/:id', (req, res) => {
  const p = db.prepare('SELECT * FROM patients WHERE id=?').get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

router.post('/', (req, res) => {
  const { firstName, lastName, dob, gender, phone, region, district, addr, history } = req.body;
  if (!firstName || !lastName) return res.status(400).json({ error: 'Name required' });
  const r = db.prepare('INSERT INTO patients (firstName,lastName,dob,gender,phone,region,district,addr,history) VALUES (?,?,?,?,?,?,?,?,?)').run(firstName, lastName, dob || '', gender || 'erkak', phone || '', region || '', district || '', addr || '', history || '');
  res.json(db.prepare('SELECT * FROM patients WHERE id=?').get(r.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const { firstName, lastName, dob, gender, phone, region, district, addr, history } = req.body;
  db.prepare('UPDATE patients SET firstName=?,lastName=?,dob=?,gender=?,phone=?,region=?,district=?,addr=?,history=? WHERE id=?').run(firstName, lastName, dob || '', gender || 'erkak', phone || '', region || '', district || '', addr || '', history || '', req.params.id);
  res.json(db.prepare('SELECT * FROM patients WHERE id=?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM patients WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
