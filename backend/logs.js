const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM logs ORDER BY time DESC LIMIT 200').all());
});

router.post('/', (req, res) => {
  const { action, icon, type, user } = req.body;
  db.prepare('INSERT INTO logs (action,icon,type,user) VALUES (?,?,?,?)').run(action || '', icon || 'LOG', type || 'info', user || 'System');
  res.json({ ok: true });
});

router.delete('/', (req, res) => {
  db.prepare('DELETE FROM logs').run();
  res.json({ ok: true });
});

module.exports = router;
