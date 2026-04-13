const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/stats', (req, res) => {
  const { from, to, doctorName } = req.query;
  let q = 'SELECT * FROM appointments WHERE 1=1';
  const params = [];
  if (from) { q += ' AND date>=?'; params.push(from); }
  if (to) { q += ' AND date<=?'; params.push(to); }
  if (doctorName) { q += ' AND doctorName=?'; params.push(doctorName); }

  const apts = db.prepare(q).all(...params);
  const paid = apts.filter(a => a.paid);
  const done = apts.filter(a => a.status === 'done');
  const income = paid.reduce((s, a) => s + (a.price || 0), 0);

  const docMap = {};
  apts.forEach(a => docMap[a.doctorName] = (docMap[a.doctorName] || 0) + 1);
  const topDocs = Object.entries(docMap).sort((a, b) => b[1] - a[1]);

  const today = new Date().toISOString().slice(0, 10);
  const todayApts = db.prepare("SELECT * FROM appointments WHERE date=?").all(today);
  const todayIncome = todayApts.filter(a => a.paid).reduce((s, a) => s + (a.price || 0), 0);

  res.json({
    total: apts.length,
    done: done.length,
    income,
    todayCount: todayApts.length,
    todayIncome,
    topDocs,
    recent: apts.sort((a, b) => b.createdAt > a.createdAt ? 1 : -1).slice(0, 15),
    allApts: apts
  });
});

module.exports = router;
