const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', (req, res) => {
  let q = 'SELECT * FROM appointments';
  const params = [];
  const wheres = [];
  if (req.query.date) { wheres.push('date=?'); params.push(req.query.date); }
  if (req.query.status) { wheres.push('status=?'); params.push(req.query.status); }
  if (req.query.doctorId) { wheres.push('doctorId=?'); params.push(req.query.doctorId); }
  if (req.query.patientId) { wheres.push('patientId=?'); params.push(req.query.patientId); }
  if (wheres.length) q += ' WHERE ' + wheres.join(' AND ');
  q += ' ORDER BY date DESC, time ASC';
  res.json(db.prepare(q).all(...params));
});

router.post('/', (req, res) => {
  const { patientId, patientName, doctorId, doctorName, date, time, price, note } = req.body;
  if (!doctorId || !date || !time) return res.status(400).json({ error: 'Required fields missing' });

  // Check slot conflict
  const conflict = db.prepare("SELECT id FROM appointments WHERE doctorId=? AND date=? AND time=? AND status!='cancelled'").get(doctorId, date, time);
  if (conflict) return res.status(409).json({ error: 'Bu vaqt band!' });

  // Queue number
  const sameDay = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE doctorId=? AND date=? AND status!='cancelled'").get(doctorId, date).c;
  const queue = sameDay + 1;

  const r = db.prepare('INSERT INTO appointments (patientId,patientName,doctorId,doctorName,date,time,queue,price,note) VALUES (?,?,?,?,?,?,?,?,?)').run(patientId || null, patientName || 'Mehmon', doctorId, doctorName, date, time, queue, price || 0, note || '');
  res.json(db.prepare('SELECT * FROM appointments WHERE id=?').get(r.lastInsertRowid));
});

router.patch('/:id', (req, res) => {
  const apt = db.prepare('SELECT * FROM appointments WHERE id=?').get(req.params.id);
  if (!apt) return res.status(404).json({ error: 'Not found' });
  const { status, paid, doneNote } = req.body;
  if (status !== undefined) db.prepare('UPDATE appointments SET status=? WHERE id=?').run(status, req.params.id);
  if (paid !== undefined) db.prepare('UPDATE appointments SET paid=? WHERE id=?').run(paid ? 1 : 0, req.params.id);
  if (doneNote !== undefined) db.prepare('UPDATE appointments SET doneNote=? WHERE id=?').run(doneNote, req.params.id);
  res.json(db.prepare('SELECT * FROM appointments WHERE id=?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM appointments WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
