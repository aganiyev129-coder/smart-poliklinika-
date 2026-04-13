const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'polyclinic.db'));

db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT DEFAULT '',
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    photo TEXT DEFAULT '',
    doctorId INTEGER DEFAULT NULL,
    createdAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    spec TEXT NOT NULL DEFAULT 'Terapevt',
    start TEXT DEFAULT '08:00',
    end TEXT DEFAULT '17:00',
    price INTEGER DEFAULT 0,
    phone TEXT DEFAULT '',
    exp INTEGER DEFAULT 0,
    photo TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    dob TEXT DEFAULT '',
    gender TEXT DEFAULT 'erkak',
    phone TEXT DEFAULT '',
    region TEXT DEFAULT '',
    district TEXT DEFAULT '',
    addr TEXT DEFAULT '',
    history TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patientId INTEGER,
    patientName TEXT NOT NULL,
    doctorId INTEGER,
    doctorName TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    queue INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending',
    price INTEGER DEFAULT 0,
    paid INTEGER DEFAULT 0,
    paymentMethod TEXT DEFAULT '',
    doneNote TEXT DEFAULT '',
    note TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chatKey TEXT NOT NULL,
    text TEXT NOT NULL,
    sender TEXT NOT NULL,
    isPrescription INTEGER DEFAULT 0,
    time TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT DEFAULT '',
    icon TEXT DEFAULT 'LOG',
    type TEXT DEFAULT 'info',
    user TEXT DEFAULT 'System',
    time TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS clinic_settings (
    key TEXT PRIMARY KEY,
    value TEXT DEFAULT ''
  );
`);

try { db.exec('ALTER TABLE users ADD COLUMN doctorId INTEGER DEFAULT NULL'); } catch (e) {}

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const docCount = db.prepare('SELECT COUNT(*) as c FROM doctors').get().c;

  if (docCount === 0 && userCount === 0) {
    const h = pw => bcrypt.hashSync(pw, 10);
    const insUser = db.prepare('INSERT INTO users (firstName,lastName,username,password,role,doctorId) VALUES (?,?,?,?,?,?)');
    insUser.run('Akbar', 'Usmonov', 'admin', h('admin123'), 'superadmin', null);
    insUser.run('Sarvinoz', 'Tosheva', 'reg', h('reg123'), 'registrar', null);

    const insDoc = db.prepare('INSERT INTO doctors (firstName,lastName,spec,start,end,price,phone,exp) VALUES (?,?,?,?,?,?,?,?)');
    const d1 = insDoc.run('Alisher', 'Karimov', 'Terapevt', '08:00', '17:00', 80000, '+998901234567', 8);
    insUser.run('Alisher', 'Karimov', 'alisher', h('alisher123'), 'doctor', d1.lastInsertRowid);
    const d2 = insDoc.run('Malika', 'Yusupova', 'Kardiolog', '09:00', '18:00', 120000, '+998901234568', 12);
    insUser.run('Malika', 'Yusupova', 'malika', h('malika123'), 'doctor', d2.lastInsertRowid);
    const d3 = insDoc.run('Bobur', 'Toshmatov', 'Neyropatolog', '08:00', '16:00', 100000, '+998901234569', 6);
    insUser.run('Bobur', 'Toshmatov', 'bobur', h('bobur123'), 'doctor', d3.lastInsertRowid);
  }

  const settCount = db.prepare('SELECT COUNT(*) as c FROM clinic_settings').get().c;
  if (settCount === 0) {
    const ins = db.prepare('INSERT INTO clinic_settings (key,value) VALUES (?,?)');
    ins.run('name', 'Aqlli Poliklinika');
    ins.run('addr', '');
    ins.run('phone', '');
  }
}

seed();
module.exports = db;
