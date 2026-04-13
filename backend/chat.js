const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// Auth optional (patients use portal without JWT)
function optionalAuth(req, res, next) {
  const header = req.headers.authorization;
  if (header) {
    const jwt = require('jsonwebtoken');
    try {
      req.user = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET || 'secret');
    } catch {}
  }
  next();
}

router.get('/:key', optionalAuth, (req, res) => {
  const msgs = db.prepare('SELECT * FROM chats WHERE chatKey=? ORDER BY time ASC').all(req.params.key);
  res.json(msgs);
});

router.post('/', optionalAuth, (req, res) => {
  const { chatKey, text, sender, isPrescription } = req.body;
  if (!chatKey || !text) return res.status(400).json({ error: 'Required fields missing' });
  const r = db.prepare('INSERT INTO chats (chatKey,text,sender,isPrescription,time) VALUES (?,?,?,?,?)').run(chatKey, text, sender || 'unknown', isPrescription ? 1 : 0, new Date().toISOString());
  res.json(db.prepare('SELECT * FROM chats WHERE id=?').get(r.lastInsertRowid));
});

module.exports = router;
