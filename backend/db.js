const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'polyclinic.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    name TEXT,
    photo TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS doctors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    specialty TEXT,
    phone TEXT,
    photo TEXT,
    schedule TEXT,
    price INTEGER DEFAULT 0,
    userId INTEGER
  );
  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    firstName TEXT NOT NULL,
    lastName TEXT NOT NULL,
    phone TEXT,
    birthDate TEXT,
    address TEXT,
    photo TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patientId INTEGER,
    patientName TEXT,
    doctorId INTEGER,
    doctorName TEXT,
    date TEXT,
    time TEXT,
    queue INTEGER,
    status TEXT DEFAULT 'pending',
    price INTEGER DEFAULT 0,
    paid INTEGER DEFAULT 0,
    paymentMethod TEXT,
    note TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS chats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    chatKey TEXT,
    text TEXT,
    sender TEXT,
    isPrescription INTEGER DEFAULT 0,
    time TEXT
  );
  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER,
    username TEXT,
    action TEXT,
    detail TEXT,
    createdAt TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    clinicName TEXT DEFAULT 'Smart Polyclinic',
    address TEXT,
    phone TEXT,
    lang TEXT DEFAULT 'uz'
  );
  INSERT OR IGNORE INTO settings (id) VALUES (1);
  INSERT OR IGNORE INTO users (username, password, role, name) VALUES
    ('admin', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Administrator');
`);

module.exports = db;
