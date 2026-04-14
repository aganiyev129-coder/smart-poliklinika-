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
    role TEXT NOT NULL CHECK(role IN ('superadmin','registrar','doctor')),
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
    price INTEGER DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','done','cancelled')),
    paid INTEGER DEFAULT 0,
    note TEXT DEFAULT '',
    doneNote TEXT DEFAULT '',
    createdAt TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chatKey TEXT NOT NULL,
    text TEXT NOT NULL,
    sender TEXT NOT NULL,
    isPrescription INTEGER DEFAULT 0,
    time TEXT DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_chats_key ON chats(chatKey);

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
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

// Migration: add doctorId column if it doesn't exist (for existing databases)
try { db.exec('ALTER TABLE users ADD COLUMN doctorId INTEGER DEFAULT NULL'); } catch (e) {}

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
  const docCount = db.prepare('SELECT COUNT(*) as c FROM doctors').get().c;

  if (docCount === 0 && userCount === 0) {
    const h = pw => bcrypt.hashSync(pw, 10);

    // Insert admin and registrar
    const insUser = db.prepare('INSERT INTO users (firstName,lastName,username,password,role,doctorId) VALUES (?,?,?,?,?,?)');
    insUser.run('Akbar', 'Usmonov', 'admin', h('admin123'), 'superadmin', null);
    insUser.run('Sarvinoz', 'Tosheva', 'reg', h('reg123'), 'registrar', null);

    // Insert doctors and link each to their own user account
    const insDoc = db.prepare('INSERT INTO doctors (firstName,lastName,spec,start,end,price,phone,exp) VALUES (?,?,?,?,?,?,?,?)');

    const d1 = insDoc.run('Alisher', 'Karimov', 'Terapevt', '08:00', '17:00', 80000, '+998901234567', 8);
    insUser.run('Alisher', 'Karimov', 'alisher', h('alisher123'), 'doctor', d1.lastInsertRowid);

    const d2 = insDoc.run('Malika', 'Yusupova', 'Kardiolog', '09:00', '18:00', 120000, '+998901234568', 12);
    insUser.run('Malika', 'Yusupova', 'malika', h('malika123'), 'doctor', d2.lastInsertRowid);

    const d3 = insDoc.run('Bobur', 'Toshmatov', 'Neyropatolog', '08:00', '16:00', 100000, '+998901234569', 6);
    insUser.run('Bobur', 'Toshmatov', 'bobur', h('bobur123'), 'doctor', d3.lastInsertRowid);

  } else if (docCount === 0) {
    // Only doctors missing
    const insDoc = db.prepare('INSERT INTO doctors (firstName,lastName,spec,start,end,price,phone,exp) VALUES (?,?,?,?,?,?,?,?)');
    insDoc.run('Alisher', 'Karimov', 'Terapevt', '08:00', '17:00', 80000, '+998901234567', 8);
    insDoc.run('Malika', 'Yusupova', 'Kardiolog', '09:00', '18:00', 120000, '+998901234568', 12);
    insDoc.run('Bobur', 'Toshmatov', 'Neyropatolog', '08:00', '16:00', 100000, '+998901234569', 6);
  }

  const patCount = db.prepare('SELECT COUNT(*) as c FROM patients').get().c;
  if (patCount === 0) {
    const ins = db.prepare('INSERT INTO patients (firstName,lastName,dob,gender,phone,region,district,addr,history) VALUES (?,?,?,?,?,?,?,?,?)');
    ins.run('Sherzod', 'Raximov', '1990-03-15', 'erkak', '+998901111111', 'Toshkent shahri', 'Yunusobod tumani', "Navoiy ko'chasi 5", 'Gipertoniya');
    ins.run('Nilufar', 'Hasanova', '1985-07-22', 'ayol', '+998902222222', 'Samarqand viloyati', 'Samarqand shahri', "Registon ko'chasi 12", 'Allergiya bor');
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
