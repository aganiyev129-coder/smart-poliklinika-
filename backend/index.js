require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db = require('./db');

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: FRONTEND_URL, methods: ['GET', 'POST'] }
});

app.use(cors({ origin: FRONTEND_URL }));
app.use(express.json({ limit: '10mb' })); // allow base64 photos

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/doctors', require('./routes/doctors'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/logs', require('./routes/logs'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/reports', require('./routes/reports'));

// Portal routes (no auth required)
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

// Socket.io — Real-time chat
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (token) {
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    } catch {}
  }
  next();
});

io.on('connection', (socket) => {
  socket.on('join-chat', (chatKey) => {
    socket.join(chatKey);
  });

  socket.on('send-message', ({ chatKey, message }) => {
    // Persist to DB
    db.prepare('INSERT INTO chats (chatKey,text,sender,isPrescription,time) VALUES (?,?,?,?,?)').run(
      chatKey, message.text, message.sender, message.isPrescription ? 1 : 0, new Date().toISOString()
    );
    // Broadcast to all in room
    io.to(chatKey).emit('new-message', { ...message, time: new Date().toISOString() });
  });

  socket.on('disconnect', () => {});
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
