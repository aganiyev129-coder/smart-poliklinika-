require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
const db = require('./db');

const app = express();
const httpServer = createServer(app);
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', require('./login'));
app.use('/api/doctors', require('./doctors'));
app.use('/api/patients', require('./patients'));
app.use('/api/appointments', require('./appointments'));
app.use('/api/users', require('./users'));
app.use('/api/chat', require('./chat'));
app.use('/api/logs', require('./logs'));
app.use('/api/settings', require('./settings'));
app.use('/api/reports', require('./reports'));

app.get('/api/portal/doctors', (req, res) => {
  res.json(db.prepare('SELECT * FROM doctors ORDER BY id').all());
});
app.get('/api/portal/patients', (req, res) => {
  const q = req.query.q || '';
  res.json(db.prepare("SELECT * FROM patients WHERE firstName||' '||lastName||' '||phone LIKE ? ORDER BY id LIMIT 10").all(`%${q}%`));
});
app.get('/api/portal/appointments', (req, res) => {
  const { patientId, patientName } = req.query;
  if (patientId) {
    res.json(db.prepare("SELECT * FROM appointments WHERE patientId=? ORDER BY date DESC, time ASC").all(patientId));
  } else if (patientName) {
    res.json(db.prepare("SELECT * FROM appointments WHERE patientName=? ORDER BY date DESC, time ASC").all(patientName));
  } else {
    res.json([]);
  }
});
app.post('/api/portal/book', (req, res) => {
  const { patientId, patientName, doctorId, doctorName, date, time, price } = req.body;
  if (!doctorId || !date || !time) return res.status(400).json({ error: 'Required fields missing' });
  const conflict = db.prepare("SELECT id FROM appointments WHERE doctorId=? AND date=? AND time=? AND status!='cancelled'").get(doctorId, date, time);
  if (conflict) return res.status(409).json({ error: 'Bu vaqt band!' });
  const sameDay = db.prepare("SELECT COUNT(*) as c FROM appointments WHERE doctorId=? AND date=? AND status!='cancelled'").get(doctorId, date).c;
  const queue = sameDay + 1;
  const r = db.prepare('INSERT INTO appointments (patientId,patientName,doctorId,doctorName,date,time,queue,price,note) VALUES (?,?,?,?,?,?,?,?,?)').run(patientId || null, patientName || 'Mehmon', doctorId, doctorName, date, time, queue, price || 0, 'Portal orqali belgilangan');
  res.json(db.prepare('SELECT * FROM appointments WHERE id=?').get(r.lastInsertRowid));
});

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    try { socket.user = jwt.verify(token, process.env.JWT_SECRET || 'secret'); } catch {}
  }
  next();
});
io.on('connection', (socket) => {
  socket.on('join-chat', (chatKey) => { socket.join(chatKey); });
  socket.on('send-message', ({ chatKey, message }) => {
    db.prepare('INSERT INTO chats (chatKey,text,sender,isPrescription,time) VALUES (?,?,?,?,?)').run(
      chatKey, message.text, message.sender, message.isPrescription ? 1 : 0, new Date().toISOString()
    );
    io.to(chatKey).emit('new-message', { ...message, time: new Date().toISOString() });
  });
  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
