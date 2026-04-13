const express = require('express');
const router = express.Router();
const db = require('./db');
const auth = require('./auth');

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM clinic_settings').all();
  const obj = {};
  rows.forEach(r => obj[r.key] = r.value);
  res.json(obj);
});

router.put('/', auth, (req, res) => {
  const upd = db.prepare('INSERT INTO clinic_settings (key,value) VALUES (?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');
  Object.entries(req.body).forEach(([k, v]) => upd.run(k, v));
  const rows = db.prepare('SELECT * FROM clinic_settings').all();
  const obj = {};
  rows.forEach(r => obj[r.key] = r.value);
  res.json(obj);
});

module.exports = router;
